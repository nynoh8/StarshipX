import React, { useState, useEffect, useRef } from "react";
import { 
  Database, 
  X, 
  Terminal, 
  Play, 
  Pause, 
  Search, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  ChevronDown, 
  ChevronUp,
  RefreshCw
} from "lucide-react";
import { io, Socket } from "socket.io-client";

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

interface DBDebugPopupProps {
  lang: string;
}

export function DBDebugPopup({ lang }: DBDebugPopupProps) {
  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem("db_debug_open") === "true";
  });
  
  const [isLoggingActive, setIsLoggingActive] = useState(() => {
    const saved = localStorage.getItem("db_logging_active");
    return saved === null ? true : saved === "true";
  });

  const [logs, setLogs] = useState<DBLog[]>([]);
  const [filterText, setFilterText] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Sync state changes to local storage
  useEffect(() => {
    localStorage.setItem("db_debug_open", String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem("db_logging_active", String(isLoggingActive));
  }, [isLoggingActive]);

  // Connect to Socket.IO for real-time DB logs
  useEffect(() => {
    // Only connect / listen to socket if socket.io is initialized
    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("get_db_logs");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("db_logs_history", (history: DBLog[]) => {
      if (isLoggingActive) {
        setLogs(history);
      }
    });

    socket.on("db_log", (newLog: DBLog) => {
      if (isLoggingActive) {
        setLogs(prev => {
          const updated = [...prev, newLog];
          if (updated.length > 100) {
            updated.shift();
          }
          return updated;
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isLoggingActive]);

  // Auto scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = logs.filter(log => {
    if (!filterText) return true;
    const search = filterText.toLowerCase();
    return (
      log.query.toLowerCase().includes(search) ||
      (log.error && log.error.toLowerCase().includes(search)) ||
      log.id.toLowerCase().includes(search)
    );
  });

  const translations: Record<string, any> = {
    pt: {
      title: "Monitor do Banco de Dados",
      active: "Ativo",
      inactive: "Inativo",
      toggleActive: "Ativar Registro",
      toggleInactive: "Desativar Registro",
      clear: "Limpar",
      searchPlaceholder: "Filtrar consultas (SELECT, INSERT, jogadores, erro...)",
      noLogs: "Nenhum comando registrado no banco de dados ainda.",
      success: "Sucesso",
      error: "Erro",
      duration: "Duração",
      rows: "Linhas",
      copied: "Copiado!",
      parameters: "Parâmetros:",
      errorMessage: "Mensagem de Erro:",
      sqlExplanation: "As consultas SQL executadas pelo jogo são registradas aqui em tempo real. Se o banco de dados estiver offline, as operações de fallback de simulação também serão mostradas.",
      online: "Servidor Conectado",
      offline: "Buscando Servidor..."
    },
    en: {
      title: "Database Transaction Monitor",
      active: "Active",
      inactive: "Disabled",
      toggleActive: "Enable Logging",
      toggleInactive: "Disable Logging",
      clear: "Clear",
      searchPlaceholder: "Filter queries (SELECT, INSERT, users, error...)",
      noLogs: "No database commands registered yet.",
      success: "Success",
      error: "Error",
      duration: "Duration",
      rows: "Rows",
      copied: "Copied!",
      parameters: "Parameters:",
      errorMessage: "Error Message:",
      sqlExplanation: "SQL queries executed by the game are recorded here in real-time. If the database is offline, diagnostic fallback operations are captured too.",
      online: "Server Connected",
      offline: "Reconnecting Server..."
    },
    es: {
      title: "Monitor de Base de Datos",
      active: "Activo",
      inactive: "Inactivo",
      toggleActive: "Activar Registro",
      toggleInactive: "Desactivar Registro",
      clear: "Limpiar",
      searchPlaceholder: "Filtrar por (SELECT, INSERT, jugadores, error...)",
      noLogs: "Ningún comando registrado en la base de datos aún.",
      success: "Éxito",
      error: "Error",
      duration: "Duración",
      rows: "Filas",
      copied: "¡Copiado!",
      parameters: "Parámetros:",
      errorMessage: "Mensaje de Error:",
      sqlExplanation: "Las consultas SQL ejecutadas por el juego se registran aquí en tiempo real. Si la base de datos está desconectada, también se muestran las operaciones de simulación.",
      online: "Servidor Conectado",
      offline: "Conectando al Servidor..."
    }
  };

  const t = translations[lang] || translations["en"];

  return (
    <>
      {/* Floating Toggle Button (Bottom-left to prevent overlay conflicts with main UI buttons) */}
      <div className="fixed bottom-6 left-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-mono text-sm font-bold shadow-lg transition-all ${
            isOpen 
              ? "bg-emerald-500 text-black border-emerald-400" 
              : "bg-slate-900/95 hover:bg-slate-800 text-emerald-400 border-white/10 hover:border-emerald-500/50"
          }`}
          title={t.title}
        >
          <div className="relative">
            <Database className={`w-5 h-5 ${isOpen ? "animate-bounce" : ""}`} />
            {isLoggingActive && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <span>{isOpen ? t.title : "DB LOGS"}</span>
        </button>
      </div>

      {/* Main Slider Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 left-0 w-full max-w-xl md:max-w-2xl bg-slate-950/95 border-r border-white/10 shadow-[5px_0_30px_rgba(0,0,0,0.5)] z-50 flex flex-col font-mono text-xs text-slate-300 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Terminal className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white tracking-wider flex items-center gap-2">
                  {t.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                  <span>{isConnected ? t.online : t.offline}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Explainer / Tips */}
          <div className="p-3 bg-blue-950/20 border-b border-blue-500/10 text-slate-450 text-[11px] leading-relaxed text-slate-400">
            {t.sqlExplanation}
          </div>

          {/* Controls Bar */}
          <div className="p-3 border-b border-white/10 bg-slate-900/30 flex flex-wrap items-center justify-between gap-3">
            {/* Logging Activation Toggle Button */}
            <button
              onClick={() => setIsLoggingActive(!isLoggingActive)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold border transition-all text-[11px] uppercase ${
                isLoggingActive 
                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                  : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
              }`}
            >
              {isLoggingActive ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t.active} ({t.toggleInactive})</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>{t.inactive} ({t.toggleActive})</span>
                </>
              )}
            </button>

            {/* Clear logs button */}
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all text-[11px]"
              title={t.clear}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.clear.toUpperCase()}</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-white/10 bg-slate-950">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/15 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-all text-xs"
              />
              {filterText && (
                <button 
                  onClick={() => setFilterText("")}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Realtime Logs List */}
          <div 
            className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-950 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            ref={logContainerRef}
          >
            {filteredLogs.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Database className="w-8 h-8 text-slate-600 animate-pulse" />
                <p className="text-[11px] text-center max-w-xs">{t.noLogs}</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const isSuccess = log.success;
                const dateObj = new Date(log.timestamp);
                const timeString = `${dateObj.toLocaleTimeString()} .${String(dateObj.getMilliseconds()).padStart(3, '0')}`;

                return (
                  <div 
                    key={log.id} 
                    className={`rounded-lg border transition-all ${
                      isSuccess 
                        ? "bg-slate-900/40 border-white/5" 
                        : "bg-red-950/10 border-red-900/20"
                    }`}
                  >
                    {/* Header Row */}
                    <div 
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/5 select-none text-[11px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isSuccess ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        )}
                        
                        <span className="font-bold text-[10px] text-slate-500 shrink-0 bg-white/5 px-1.5 py-0.5 rounded">
                          {log.id}
                        </span>

                        <span className="text-slate-400 font-mono text-[10px] shrink-0">
                          {timeString}
                        </span>

                        <span className="font-bold max-w-xs truncate text-[11px] text-slate-200">
                          {log.query.trim().slice(0, 45)}{log.query.length > 45 ? "..." : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] shrink-0">
                        <span className="text-slate-500">
                          {log.durationMs}ms
                        </span>

                        {log.rowsCount !== undefined && (
                          <span className="text-slate-500 bg-white/5 px-1 py-0.5 rounded">
                            {t.rows}: {log.rowsCount}
                          </span>
                        )}

                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Detailed Row Expanded */}
                    {isExpanded && (
                      <div className="p-3 pt-0 border-t border-white/5 bg-slate-950/60 transition-all">
                        <div className="mt-3 flex items-start justify-between gap-2">
                          <pre className="font-mono text-slate-100 text-[11px] whitespace-pre-wrap break-all select-all flex-1 bg-black/40 p-2.5 rounded border border-white/5">
                            {log.query}
                          </pre>
                          <button
                            onClick={() => copyToClipboard(log.query, log.id)}
                            className="bg-white/5 hover:bg-white/10 p-2 rounded text-slate-400 hover:text-white transition-colors"
                            title="Copy Query"
                          >
                            {copiedId === log.id ? (
                              <span className="text-[9px] text-emerald-400 font-bold">{t.copied}</span>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Query Params Display */}
                        {log.params && log.params.length > 0 && (
                          <div className="mt-3">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">{t.parameters}</span>
                            <div className="mt-1 bg-black/20 p-2 rounded border border-white/5 text-[10px] text-emerald-400 whitespace-pre-wrap font-mono select-all">
                              {JSON.stringify(log.params, null, 2)}
                            </div>
                          </div>
                        )}

                        {/* Error Message Display */}
                        {log.error && (
                          <div className="mt-3 p-2.5 bg-red-950/25 text-red-400 border border-red-500/25 rounded text-[11px]">
                            <span className="font-bold uppercase text-[10px] text-red-500 block mb-1">{t.errorMessage}</span>
                            {log.error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Diagnostic Stats */}
          <div className="p-3 border-t border-white/10 bg-slate-900/50 flex items-center justify-between text-[10px] text-slate-500">
            <span>TOTAL RETRIEVED: {logs.length} / 100</span>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-emerald-500" />
              <span>Diagnostic Client ACTIVE</span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
