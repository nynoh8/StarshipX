import pkg from 'pg';
const { Pool } = pkg;

export interface DBLog {
  id: string;
  timestamp: string;
  query: string;
  params?: any[];
  durationMs: number;
  success: boolean;
  error?: string;
  rowsCount?: number;
}

export const dbLogs: DBLog[] = [];
type LogListener = (log: DBLog) => void;
const logListeners: Set<LogListener> = new Set();

export function addDBLogListener(listener: LogListener) {
  logListeners.add(listener);
}

export function removeDBLogListener(listener: LogListener) {
  logListeners.delete(listener);
}

export function logDatabaseEvent(query: string, params?: any[], durationMs: number = 0, success: boolean = true, error?: string, rowsCount?: number) {
  const log: DBLog = {
    id: Math.random().toString(36).substring(2, 9).toUpperCase(),
    timestamp: new Date().toISOString(),
    query,
    params,
    durationMs,
    success,
    error,
    rowsCount
  };
  dbLogs.push(log);
  if (dbLogs.length > 100) {
    dbLogs.shift();
  }
  logListeners.forEach(listener => {
    try {
      listener(log);
    } catch (e) {
      console.error("Error in DB log listener:", e);
    }
  });
}

// Configuração profissional com variáveis de ambiente e SSL obrigatório
export let pool = process.env.DB_HOST ? new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: {
    rejectUnauthorized: false // Em ambientes gerenciados (como Supabase/Neon), geralmente é false ou requer certificado
  }
}) : null;

if (pool) {
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  // Intercept pool.query to automatically log and broadcast all interactions
  const originalQuery = pool.query.bind(pool);
  pool.query = async function (text: any, params?: any) {
    const start = Date.now();
    let queryText = "";
    let queryParams = params;

    if (typeof text === "string") {
      queryText = text;
    } else if (text && typeof text === "object") {
      queryText = text.text || "Unknown Query Object";
      if (text.values && !queryParams) {
        queryParams = text.values;
      }
    }

    try {
      const res = await originalQuery(text, params);
      const duration = Date.now() - start;
      logDatabaseEvent(queryText, queryParams, duration, true, undefined, res.rowCount || (res.rows ? res.rows.length : 0));
      return res;
    } catch (err: any) {
      const duration = Date.now() - start;
      logDatabaseEvent(queryText, queryParams, duration, false, err.message);
      throw err;
    }
  } as any;
}

export async function initDB() {
  if (!pool) {
    console.warn("⚠️ Variáveis de banco de dados não configuradas. Rodando em modo memória (sem persistência).");
    logDatabaseEvent("DATABASE INITIALIZATION", [], 0, false, "Database offline (Using local storage / memory state fallback)");
    return;
  }
  try {
    const initStart = Date.now();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jogadores (
        id UUID PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE,
        nickname VARCHAR(16) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    try {
      await pool.query(`ALTER TABLE jogadores ADD COLUMN google_id VARCHAR(255) UNIQUE;`);
    } catch (e) {
      // Column might already exist
    }

    try {
      await pool.query(`UPDATE jogadores SET nickname = SUBSTRING(nickname FOR 16) WHERE LENGTH(nickname) > 16;`);
      await pool.query(`ALTER TABLE jogadores ALTER COLUMN nickname TYPE VARCHAR(16);`);
    } catch (e) {
      console.error("Erro ao alterar nickname para VARCHAR(16):", e);
    }
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS naves (
        id UUID PRIMARY KEY,
        owner_id UUID REFERENCES jogadores(id),
        seed VARCHAR(255) NOT NULL,
        vida INTEGER DEFAULT 100,
        posicao_x FLOAT DEFAULT 0,
        posicao_y FLOAT DEFAULT 0,
        posicao_z FLOAT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Added payment_credits table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_credits (
        user_id TEXT PRIMARY KEY,
        credits INTEGER DEFAULT 0,
        is_unlocked BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add is_unlocked column if it doesn't exist
    try {
      await pool.query(`ALTER TABLE payment_credits ADD COLUMN is_unlocked BOOLEAN DEFAULT FALSE;`);
    } catch(e) {
      // Ignore if it already exists
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        stripe_payment_intent VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'paid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Fix existing seeds that have _random or other palettes
    try {
      await pool.query(`UPDATE naves SET seed = split_part(seed, '_', 1) WHERE seed LIKE '%\_%';`);
    } catch(e) {
      console.error("Erro ao atualizar seeds antigas:", e);
    }

    const duration = Date.now() - initStart;
    logDatabaseEvent("SCHEMA SYNCHRONIZATION", [], duration, false, undefined, 4);
    console.log("✅ Banco de dados inicializado com sucesso.");
  } catch (err: any) {
    console.error("❌ Erro ao inicializar banco de dados. Desativando persistência:", err);
    console.error("⚠️ O banco de dados está indisponível no momento.");
    logDatabaseEvent("SCHEMA SYNCHRONIZATION", [], 0, false, err ? err.message : "Database connection failed");
    pool = null;
  }
}
