import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import cookieParser from "cookie-parser";
import { v4 as uuidv4 } from "uuid";
import { getShipStats } from "./src/utils/shipStats.ts";
import { generateSolarSpawnPoint, isOutsideSun } from "./src/utils/solarSpawn.ts";
import path from "path";
import { rateLimit } from "express-rate-limit";

// In-Memory Data Structures (Pure in-memory game state without external database or keys)
interface UserRecord {
  id: string;
  dbId: string;
  email?: string;
  name: string;
  picture?: string;
  createdAt: string;
}

interface ShipRecord {
  id: string;
  owner_id: string;
  seed: string;
  vida: number;
  posicao_x: number;
  posicao_y: number;
  posicao_z: number;
  created_at: string;
}

const usersStore = new Map<string, UserRecord>();
const shipsStore = new Map<string, ShipRecord[]>();

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(cookieParser());
  app.use(express.json());

  // General API protection
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições. Aguarde 1 minuto." },
    validate: { trustProxy: false }
  });

  app.use("/api/", apiLimiter);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Direct guest pilot login (instant access without OAuth or keys)
  app.post("/api/auth/guest-login", (req, res) => {
    try {
      const { name } = req.body || {};
      const pilotName = (typeof name === "string" && name.trim() ? name.trim() : "Piloto P2P").substring(0, 16);
      const dbId = "pilot_" + uuidv4().substring(0, 8);
      const userData: UserRecord = {
        id: dbId,
        dbId: dbId,
        name: pilotName,
        picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(pilotName)}`,
        createdAt: new Date().toISOString()
      };
      usersStore.set(dbId, userData);

      const baseSeed = pilotName.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 8) || "STAR77";
      const stats = getShipStats(baseSeed);
      const starterShip: ShipRecord = {
        id: uuidv4(),
        owner_id: dbId,
        seed: baseSeed,
        vida: stats.maxHealth,
        posicao_x: 0,
        posicao_y: 0,
        posicao_z: -2800,
        created_at: new Date().toISOString()
      };
      shipsStore.set(dbId, [starterShip]);

      res.cookie("session", JSON.stringify(userData), {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({ ...userData, ships: [starterShip] });
    } catch (err) {
      console.error("Guest login error:", err);
      res.status(500).json({ error: "Failed to create guest pilot" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    let userData: UserRecord | null = null;
    const session = req.cookies.session;
    if (session) {
      try {
        userData = JSON.parse(session);
      } catch (e) {}
    }
    if (!userData && req.headers["x-user-id"]) {
      const uid = req.headers["x-user-id"] as string;
      userData = usersStore.get(uid) || null;
    }

    if (!userData) {
      // Auto-assign guest profile if not logged in
      const defaultId = "guest_" + uuidv4().substring(0, 6);
      userData = {
        id: defaultId,
        dbId: defaultId,
        name: "Piloto-" + defaultId.substring(6),
        picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${defaultId}`,
        createdAt: new Date().toISOString()
      };
      usersStore.set(defaultId, userData);
    }

    const userId = userData.dbId || userData.id;
    let ships = shipsStore.get(userId) || [];
    if (ships.length === 0) {
      const baseSeed = (userId || "PILOT").substring(0, 8).toUpperCase();
      const stats = getShipStats(baseSeed);
      const starterShip: ShipRecord = {
        id: uuidv4(),
        owner_id: userId,
        seed: baseSeed,
        vida: stats.maxHealth,
        posicao_x: 0,
        posicao_y: 0,
        posicao_z: -2800,
        created_at: new Date().toISOString()
      };
      ships = [starterShip];
      shipsStore.set(userId, ships);
    }

    res.json({ ...userData, ships, canRefund: false, purchaseId: null });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("session", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.json({ success: true });
  });

  // Zero-Key Unlimited Free Credits Status
  app.get("/api/payments/status", async (req, res) => {
    res.json({ 
      credits: 9999,
      is_unlocked: true
    });
  });

  // Free Instant Ship Randomization
  app.post("/api/payments/consume-randomize", async (req, res) => {
    const session = req.cookies.session;
    const userData = session ? JSON.parse(session) : null;
    const userId = userData?.dbId || userData?.id || "pilot_guest";

    const newSeed = uuidv4().split("-")[0].toUpperCase();
    const stats = getShipStats(newSeed);
    const userShips = shipsStore.get(userId) || [];
    userShips.push({
      id: uuidv4(),
      owner_id: userId,
      seed: newSeed,
      vida: stats.maxHealth,
      posicao_x: 0,
      posicao_y: 0,
      posicao_z: -2800,
      created_at: new Date().toISOString()
    });
    shipsStore.set(userId, userShips);

    res.json({ success: true, seed: newSeed });
  });

  // User Ships Fleet
  app.get("/api/user/ships", async (req, res) => {
    const session = req.cookies.session;
    const userData = session ? JSON.parse(session) : null;
    const userId = userData?.dbId || userData?.id;

    if (!userId) return res.json({ ships: [], canRefund: false, purchaseId: null });
    const ships = shipsStore.get(userId) || [];
    res.json({ ships, canRefund: false, purchaseId: null });
  });

  // Leaderboard
  app.get("/api/leaderboard/ships", async (req, res) => {
    const leaderboardMap = new Map<string, number>();

    usersStore.forEach((user, uid) => {
      const shipCount = shipsStore.get(uid)?.length || 0;
      leaderboardMap.set(user.name, Math.max(leaderboardMap.get(user.name) || 0, shipCount));
    });

    rooms.forEach(room => {
      room.players.forEach((p: any) => {
        const currentCount = leaderboardMap.get(p.name) || 0;
        leaderboardMap.set(p.name, Math.max(currentCount, p.ownedSeeds?.length || 1));
      });
    });

    const rows = Array.from(leaderboardMap.entries()).map(([nickname, ship_count]) => ({
      nickname,
      ship_count
    }));

    rows.sort((a, b) => b.ship_count - a.ship_count);
    res.json(rows.slice(0, 10));
  });

  class GameRoom {
    id: string;
    isTraining: boolean;
    name: string;
    creatorId?: string;
    creatorName?: string;
    mediaType: "youtube" | "image" | "none";
    mediaUrl?: string;
    createdAt: string;
    isPrivate: boolean;
    password?: string;
    maxPlayers: number;
    duration: number;
    deathMode: "respawn" | "elimination";
    players = new Map();
    seedOwners = new Map();
    npcs = new Map();
    matchTime = 300;
    matchActive = true;
    matchResults: any[] = [];
    matchTimeout: NodeJS.Timeout | null = null;

    constructor(
      id: string,
      isTraining: boolean,
      name = "Arena P2P Global",
      mediaType: "youtube" | "image" | "none" = "none",
      mediaUrl = "",
      creatorId = "system",
      creatorName = "StarshipX",
      isPrivate = false,
      password?: string,
      maxPlayers = 16,
      duration = 300,
      deathMode: "respawn" | "elimination" = "respawn"
    ) {
      this.id = id;
      this.isTraining = isTraining;
      this.name = name;
      this.mediaType = mediaType;
      this.mediaUrl = mediaUrl;
      this.creatorId = creatorId;
      this.creatorName = creatorName;
      this.isPrivate = isPrivate;
      this.password = password;
      this.maxPlayers = maxPlayers;
      this.duration = duration;
      this.matchTime = duration;
      this.deathMode = deathMode;
      this.createdAt = new Date().toISOString();
      if (this.isTraining) {
        for (let i = 0; i < 5; i++) {
          this.spawnNPC(`npc-${i}`);
        }
      }
    }

    resetMatchTime() {
      this.matchTime = this.duration;
      if (this.matchTimeout) {
        clearTimeout(this.matchTimeout);
        this.matchTimeout = null;
      }
      
      if (!this.matchActive) {
        this.matchActive = true;
        this.players.forEach(p => {
          p.matchKills = 0;
          p.score = 0;
          p.ownedSeeds = [p.activeSeed];
          const stats = getShipStats(p.activeSeed);
          p.health = stats.maxHealth;
          p.isDead = false;
          const spawn = generateSolarSpawnPoint();
          p.position = spawn.position;
          p.quaternion = spawn.quaternion;
          p.lastValidPosition = spawn.position;
        });

        this.npcs.clear();
        if (this.isTraining) {
          for (let i = 0; i < 5; i++) {
            this.spawnNPC(`npc-${i}`);
          }
        }

        io.to(this.id).emit("init", [...Array.from(this.players.values()), ...Array.from(this.npcs.values())]);
        io.to(this.id).emit("leaderboard:update", this.getLeaderboard());
      }
      
      io.to(this.id).emit("match:timer", this.matchTime);
      io.to(this.id).emit("match:start");
    }

    spawnNPC(id: string) {
      const seed = Math.random().toString(36).substring(2, 10).toUpperCase();
      const stats = getShipStats(seed);
      const spawn = generateSolarSpawnPoint();
      const npc = {
        id,
        name: `Drone-${id.substring(0, 4)}`,
        activeSeed: seed,
        stats: stats,
        position: spawn.position,
        quaternion: spawn.quaternion,
        health: stats.maxHealth * 0.5,
        isDead: false,
        isNPC: true,
        lastShoot: 0,
        velocity: (Math.random() * 50) + 50,
        turnSpeed: (Math.random() * 0.5) + 0.2,
      };
      this.npcs.set(id, npc);
      io.to(this.id).emit("player:join", npc);
    }

    getLeaderboard() {
      const lb = Array.from(this.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        shipsOwned: p.ownedSeeds.length,
        kills: p.matchKills || 0,
        score: (p.score || 0) + ((p.matchKills || 0) * 100),
      }));
      lb.sort((a, b) => b.kills - a.kills || b.score - a.score || b.shipsOwned - a.shipsOwned);
      return lb.slice(0, 10);
    }
    
    updateNPCs() {
      if (!this.matchActive) return;
      this.npcs.forEach((npc, id) => {
        if (npc.isDead) return;

        const speed = npc.velocity * 0.1;
        npc.position[0] += (Math.random() - 0.5) * speed;
        npc.position[1] += (Math.random() - 0.5) * speed;
        npc.position[2] += (Math.random() - 0.5) * speed;

        io.to(this.id).emit("player:move", {
          id: npc.id,
          position: npc.position,
          quaternion: npc.quaternion,
        });

        if (Date.now() - npc.lastShoot > 3000 + Math.random() * 5000) {
          npc.lastShoot = Date.now();
          const bulletId = `bullet-npc-${id}-${Date.now()}`;
          io.to(this.id).emit("bullet:new", {
            id: bulletId,
            ownerId: npc.id,
            position: npc.position,
            velocity: [0, 0, 200],
            type: "normal"
          });
        }
      });
    }

    updateTimer() {
      if (this.duration === 0) return;

      if (this.matchTime > 0) {
        this.matchTime--;
        io.to(this.id).emit("match:timer", this.matchTime);
      } else if (this.matchActive) {
        this.matchActive = false;
        this.matchResults = Array.from(this.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          shipsOwned: p.ownedSeeds.length,
          kills: p.matchKills || 0,
          score: (p.score || 0) + ((p.matchKills || 0) * 100),
        })).sort((a, b) => b.kills - a.kills || b.score - a.score || b.shipsOwned - a.shipsOwned);

        io.to(this.id).emit("match:end", this.matchResults);

        this.matchTimeout = setTimeout(() => {
          this.matchTime = this.duration > 0 ? this.duration : 300;
          this.matchActive = true;
          this.matchTimeout = null;
          
          this.players.forEach(p => {
            p.matchKills = 0;
            p.score = 0;
            p.ownedSeeds = [p.activeSeed];
            const stats = getShipStats(p.activeSeed);
            p.health = stats.maxHealth;
            p.isDead = false;
            const spawn = generateSolarSpawnPoint();
            p.position = spawn.position;
            p.quaternion = spawn.quaternion;
            p.lastValidPosition = spawn.position;
          });

          this.npcs.clear();
          if (this.isTraining) {
            for (let i = 0; i < 5; i++) {
              this.spawnNPC(`npc-${i}`);
            }
          }

          io.to(this.id).emit("match:start");
          io.to(this.id).emit("init", [...Array.from(this.players.values()), ...Array.from(this.npcs.values())]);
          io.to(this.id).emit("leaderboard:update", this.getLeaderboard());
        }, 10000);
      }
    }
  }

  const rooms = new Map<string, GameRoom>();
  const MAX_PLAYERS_PER_ROOM = 16;
  
  // Default Global Multiplayer Rooms
  rooms.set("global-1", new GameRoom("global-1", false, "Arena P2P #1 (Alpha)", "none", "", "system", "StarshipX", false, undefined, MAX_PLAYERS_PER_ROOM, 300, "respawn"));
  rooms.set("global-2", new GameRoom("global-2", false, "Arena P2P #2 (Beta)", "none", "", "system", "StarshipX", false, undefined, MAX_PLAYERS_PER_ROOM, 300, "respawn"));
  rooms.set("global-3", new GameRoom("global-3", false, "Arena P2P #3 (Gamma)", "none", "", "system", "StarshipX", false, undefined, MAX_PLAYERS_PER_ROOM, 300, "respawn"));

  // API to list all battle rooms
  app.get("/api/rooms", (req, res) => {
    const list: any[] = [];
    rooms.forEach((r) => {
      if (!r.isTraining) {
        list.push({
          id: r.id,
          name: r.name,
          creatorName: r.creatorName,
          mediaType: r.mediaType,
          mediaUrl: r.mediaUrl,
          playerCount: r.players.size,
          maxPlayers: r.maxPlayers,
          duration: r.duration,
          deathMode: r.deathMode || "respawn",
          isPrivate: !!r.isPrivate,
          createdAt: r.createdAt,
        });
      }
    });
    res.json(list);
  });

  // API to create a custom P2P room (100% Free, Zero Key Requirements)
  app.post("/api/rooms/create", async (req, res) => {
    const session = req.cookies.session;
    let userData: UserRecord | null = null;
    if (session) {
      try { userData = JSON.parse(session); } catch (e) {}
    }
    if (!userData && req.headers["x-user-id"]) {
      const uid = req.headers["x-user-id"] as string;
      userData = usersStore.get(uid) || null;
    }

    const pilotName = userData?.name || (typeof req.body?.creatorName === "string" && req.body.creatorName.trim() ? req.body.creatorName.trim() : "Piloto P2P");
    const userId = userData?.dbId || userData?.id || "guest_" + uuidv4().substring(0, 6);

    const { name, mediaType, mediaUrl, isPrivate, password, duration, deathMode, maxPlayers, customRoomId } = req.body || {};
    const isRoomPrivate = Boolean(isPrivate);
    let cleanPassword = "";
    if (isRoomPrivate && typeof password === "string" && password.trim().length >= 2) {
      cleanPassword = password.trim().substring(0, 32);
    }

    const parsedDuration = Number(duration);
    const cleanDuration = [0, 120, 300, 600, 900].includes(parsedDuration) ? parsedDuration : 300;
    const cleanDeathMode = deathMode === "elimination" ? "elimination" : "respawn";
    const parsedMaxPlayers = Number(maxPlayers);
    const cleanMaxPlayers = [0, 2, 4, 8, 12, 16, 20].includes(parsedMaxPlayers) ? parsedMaxPlayers : 16;

    const roomTitle = (typeof name === "string" && name.trim() ? name.trim() : `Arena P2P de ${pilotName}`).substring(0, 32);

    let cleanMediaType: "youtube" | "image" | "none" = "none";
    let cleanMediaUrl = "";

    if (mediaType === "youtube" && typeof mediaUrl === "string") {
      const rawUrl = mediaUrl.trim();
      const ytRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&].*)?$/;
      const match = rawUrl.match(ytRegex);
      if (match && match[1]) {
        const videoId = match[1];
        cleanMediaType = "youtube";
        cleanMediaUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&mute=1&loop=1&playlist=${videoId}&controls=0&playsinline=1&modestbranding=1&rel=0`;
      }
    } else if (mediaType === "image" && typeof mediaUrl === "string" && mediaUrl.startsWith("data:image/")) {
      cleanMediaType = "image";
      cleanMediaUrl = mediaUrl.substring(0, 4 * 1024 * 1024);
    }

    // Custom room code support (e.g. P2P-ROOM-123)
    let roomId = "p2p-" + uuidv4().substring(0, 6).toUpperCase();
    if (typeof customRoomId === "string" && customRoomId.trim()) {
      roomId = customRoomId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").substring(0, 16) || roomId;
    }

    const newRoom = new GameRoom(
      roomId,
      false,
      roomTitle,
      cleanMediaType,
      cleanMediaUrl,
      userId,
      pilotName,
      isRoomPrivate,
      isRoomPrivate ? cleanPassword : undefined,
      cleanMaxPlayers,
      cleanDuration,
      cleanDeathMode
    );
    rooms.set(roomId, newRoom);

    console.log(`🚀 P2P Room created: [${roomId}] "${roomTitle}" by ${pilotName}`);

    res.json({
      success: true,
      remainingCredits: 9999,
      room: {
        id: roomId,
        name: roomTitle,
        mediaType: cleanMediaType,
        mediaUrl: cleanMediaUrl,
        creatorName: pilotName,
        isPrivate: isRoomPrivate,
        maxPlayers: cleanMaxPlayers,
        duration: cleanDuration,
        deathMode: cleanDeathMode,
        playerCount: 0,
      },
    });
  });

  setInterval(() => {
    rooms.forEach(room => {
      room.updateNPCs();
    });
  }, 100);

  setInterval(() => {
    rooms.forEach(room => {
      room.updateTimer();
    });
  }, 1000);

  io.on("connection", (socket) => {
    console.log("⚡ Player connected to P2P network:", socket.id);
    let currentRoomId: string | null = null;

    let moveCount = 0;
    let lastMoveReset = Date.now();
    let shootCount = 0;
    let lastShootReset = Date.now();

    // P2P WebRTC Signaling Relays (Zero server load, connects peers directly)
    socket.on("p2p:signal", (data) => {
      if (!data || !data.targetPeerId) return;
      io.to(data.targetPeerId).emit("p2p:signal", {
        fromPeerId: socket.id,
        signal: data.signal,
      });
    });

    socket.on("join", async (data) => {
      const isTraining = data.mode === "training";
      const pilotName = (data.name && String(data.name).trim() ? String(data.name).trim() : `Piloto-${socket.id.substring(0, 4)}`).substring(0, 16);
      
      let roomId = data.roomId || "global";
      if (isTraining) {
        roomId = `training-${socket.id}`;
      } else if (roomId === "global" || !rooms.has(roomId)) {
        // Auto-allocate to the first open Global Arena shard with capacity
        const globalShards = Array.from(rooms.values()).filter(
          (r) => r.id.startsWith("global") && !r.isTraining
        );
        let openShard = globalShards.find((r) => r.players.size < (r.maxPlayers || MAX_PLAYERS_PER_ROOM));
        if (!openShard) {
          const nextIndex = globalShards.length + 1;
          const shardId = `global-${nextIndex}`;
          openShard = new GameRoom(
            shardId,
            false,
            `Arena P2P Global #${nextIndex}`,
            "none",
            "",
            "system",
            "StarshipX",
            false,
            undefined,
            MAX_PLAYERS_PER_ROOM
          );
          rooms.set(shardId, openShard);
        }
        roomId = openShard.id;
      }

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new GameRoom(roomId, isTraining, `Sala P2P [${roomId}]`));
      }
      const room = rooms.get(roomId)!;

      // Player Capacity Limit Check (0 = Unlimited pilots)
      if (!isTraining && room.maxPlayers > 0 && room.players.size >= room.maxPlayers) {
        socket.emit("join_error", `Esta sala atingiu a capacidade máxima de ${room.maxPlayers} pilotos!`);
        return;
      }

      // Check Password for Private Rooms
      if (!isTraining && room.isPrivate && room.password) {
        const enteredPassword = typeof data.roomPassword === "string" ? data.roomPassword.trim() : "";
        if (enteredPassword !== room.password) {
          socket.emit("join_error", "Senha incorreta para esta sala particular!");
          return;
        }
      }

      currentRoomId = roomId;
      socket.join(roomId);
      room.resetMatchTime();

      const seed = data.seed || "STARX";
      const stats = getShipStats(seed);
      const dbId = data.dbId || `pilot_${socket.id.substring(0, 6)}`;
      const shipDbId = uuidv4();
      const cleanSeed = seed.split('_')[0];

      let existingShips = shipsStore.get(dbId) || [];
      if (!existingShips.some(s => s.seed === cleanSeed)) {
        existingShips.push({
          id: shipDbId,
          owner_id: dbId,
          seed: cleanSeed,
          vida: stats.maxHealth,
          posicao_x: data.position ? data.position[0] : 0,
          posicao_y: data.position ? data.position[1] : 0,
          posicao_z: data.position ? data.position[2] : -2800,
          created_at: new Date().toISOString()
        });
        shipsStore.set(dbId, existingShips);
      }

      const spawn = generateSolarSpawnPoint();
      const hasValidPos = data.position && isOutsideSun(data.position);
      const playerPos = hasValidPos ? data.position : spawn.position;
      const playerQuat = hasValidPos && data.quaternion ? data.quaternion : spawn.quaternion;

      const newPlayer = {
        id: socket.id,
        dbId: dbId,
        shipDbId: shipDbId,
        name: pilotName,
        activeSeed: seed,
        customParts: data.customParts,
        ownedSeeds: [seed],
        stats: stats,
        position: playerPos,
        quaternion: playerQuat,
        health: stats.maxHealth,
        isDead: false,
        matchKills: 0,
        score: 0,
        lastMoveTime: Date.now(),
        lastValidPosition: playerPos,
      };
      room.players.set(socket.id, newPlayer);
      
      socket.emit("join_success", newPlayer);
      socket.emit("room:info", {
        id: room.id,
        name: room.name,
        mediaType: room.mediaType,
        mediaUrl: room.mediaUrl,
        creatorName: room.creatorName,
        isPrivate: !!room.isPrivate,
        maxPlayers: room.maxPlayers,
        duration: room.duration,
        deathMode: room.deathMode || "respawn",
        playerCount: room.players.size,
      });

      // Send existing peers in room to newly joined socket
      socket.emit("init", [...Array.from(room.players.values()), ...Array.from(room.npcs.values())]);
      
      // Notify other players that a new player joined
      socket.to(roomId).emit("player:join", newPlayer);
      
      // Notify WebRTC mesh of new peer
      socket.to(roomId).emit("p2p:peer-joined", { peerId: socket.id });

      io.to(roomId).emit("leaderboard:update", room.getLeaderboard());
      socket.emit("match:timer", room.matchTime);
    });

    socket.on("move", (data) => {
      if (!currentRoomId) return;

      const moveNow = Date.now();
      if (moveNow - lastMoveReset > 1000) {
        moveCount = 0;
        lastMoveReset = moveNow;
      }
      moveCount++;
      if (moveCount > 80) return;

      const room = rooms.get(currentRoomId);
      if (room && room.players.has(socket.id)) {
        const player = room.players.get(socket.id);
        const prevPos = player.lastValidPosition || player.position || [0, 0, -2800];
        const lastTime = player.lastMoveTime || Date.now();
        const now = Date.now();
        const dt = (now - lastTime) / 1000;
        const sentPos = data.position;
        let isValid = true;
        
        if (dt > 0.005 && Array.isArray(prevPos) && Array.isArray(sentPos)) {
          const dx = sentPos[0] - prevPos[0];
          const dy = sentPos[1] - prevPos[1];
          const dz = sentPos[2] - prevPos[2];
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          const speedMult = player.stats?.speedMultiplier || 1.3;
          const maxAllowedDist = ((200 * speedMult * 2.2) * dt) + 180;
          
          if (dist > maxAllowedDist) {
            isValid = false;
          }
        }
        
        if (isValid) {
          player.position = sentPos;
          player.quaternion = data.quaternion;
          player.lastValidPosition = sentPos;
          player.lastMoveTime = now;
          
          socket.to(currentRoomId).emit("player:move", {
            id: socket.id,
            position: data.position,
            quaternion: data.quaternion,
          });
        } else {
          socket.emit("player:correct_position", {
            position: prevPos,
            quaternion: player.quaternion || [0, 0, 0, 1]
          });
        }
      }
    });

    socket.on("shoot", (data) => {
      if (!currentRoomId) return;

      const shootNow = Date.now();
      if (shootNow - lastShootReset > 1000) {
        shootCount = 0;
        lastShootReset = shootNow;
      }
      shootCount++;
      if (shootCount > 25) return;

      io.to(currentRoomId).emit("bullet:new", { ...data, ownerId: socket.id });
    });

    socket.on("damage", async (data) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;

      if (socket.id !== data.targetId && socket.id !== data.attackerId) return;

      const target = room.players.get(data.targetId) || room.npcs.get(data.targetId);
      const attacker = room.players.get(data.attackerId) || room.npcs.get(data.attackerId);

      if (target && target.health > 0 && !target.isDead) {
        let damageAmount = data.amount;
        if (attacker && data.bulletId !== "planet" && data.bulletId !== "player_collision") {
          damageAmount *= attacker.stats.damageMultiplier;
        }
        target.health -= damageAmount;
        
        io.to(currentRoomId).emit("player:health", { id: target.id, health: target.health });
        if (data.bulletId !== "planet" && data.bulletId !== "player_collision") {
          io.to(currentRoomId).emit("bullet:destroy", data.bulletId);
        }

        if (target.health <= 0) {
          target.health = 0;
          target.isDead = true;
          
          if (attacker && !attacker.isNPC && attacker.id !== target.id) {
            attacker.matchKills = (attacker.matchKills || 0) + 1;
            attacker.score = (attacker.score || 0) + 100;
          }

          if (attacker && !attacker.isNPC && !target.isNPC && attacker.id !== target.id) {
            target.ownedSeeds.forEach((s: string) => {
              if (!attacker.ownedSeeds.includes(s)) {
                attacker.ownedSeeds.push(s);
              }
            });
            target.ownedSeeds = [];
          }

          io.to(currentRoomId).emit("leaderboard:update", room.getLeaderboard());
          io.to(currentRoomId).emit("player:die", { id: target.id, attackerId: data.attackerId });
          
          if (target.isNPC) {
            setTimeout(() => {
              room.npcs.delete(target.id);
              room.spawnNPC(target.id);
            }, 3000);
          } else if (room.players.has(target.id)) {
            if (room.isTraining) {
              setTimeout(() => {
                io.to(target.id).emit("training:failed");
              }, 2500);
            } else if (room.deathMode === "respawn") {
              io.to(target.id).emit("player:respawning", { countdown: 3 });

              setTimeout(() => {
                if (room.players.has(target.id)) {
                  const p = room.players.get(target.id);
                  const spawn = generateSolarSpawnPoint();
                  const shipStats = getShipStats(p.activeSeed);
                  p.health = shipStats.maxHealth;
                  p.isDead = false;
                  p.position = spawn.position;
                  p.quaternion = spawn.quaternion;
                  p.lastValidPosition = spawn.position;
                  p.lastMoveTime = Date.now();

                  io.to(target.id).emit("player:respawn_self", {
                    position: spawn.position,
                    quaternion: spawn.quaternion,
                    health: p.health,
                  });

                  io.to(currentRoomId).emit("player:respawn", {
                    id: target.id,
                    position: spawn.position,
                    quaternion: spawn.quaternion,
                    health: p.health,
                    activeSeed: p.activeSeed,
                    stats: p.stats,
                  });

                  io.to(currentRoomId).emit("leaderboard:update", room.getLeaderboard());
                }
              }, 3000);
            } else {
              setTimeout(() => {
                io.to(target.id).emit("match:eliminated", "Sua nave foi destruída. Você foi eliminado e agora é um espectador!");
              }, 2500);
            }
          }
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("Player disconnected from P2P network:", socket.id);
      if (currentRoomId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          room.players.delete(socket.id);
          io.to(currentRoomId).emit("player:leave", socket.id);
          io.to(currentRoomId).emit("p2p:peer-left", { peerId: socket.id });
          io.to(currentRoomId).emit("leaderboard:update", room.getLeaderboard());
          
          if (room.isTraining && room.players.size === 0) {
            rooms.delete(currentRoomId);
          }
        }
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`P2P Game Server running without keys on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Fatal error during server startup:", err);
  process.exit(1);
});
