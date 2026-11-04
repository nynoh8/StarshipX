import mqtt, { MqttClient } from "mqtt";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { getShipStats } from "./shipStats";
import { generateSolarSpawnPoint } from "./solarSpawn";

export interface NetworkSocket {
  id: string;
  connected: boolean;
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback?: (...args: any[]) => void): void;
  emit(event: string, data?: any): void;
  disconnect(): void;
}

// Public, zero-cost, zero-key MQTT WebSocket brokers for serverless P2P mesh
const BROKERS = [
  "wss://broker.hivemq.com:8884/mqtt",
  "wss://broker.emqx.io:8084/mqtt",
];

export class ServerlessMqttSocket implements NetworkSocket {
  public id: string;
  public connected: boolean = false;
  private client: MqttClient | null = null;
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();
  private roomId: string = "global";
  private localPlayer: any = null;
  private peers: Map<string, any> = new Map();
  private heartbeatInterval: any = null;
  private isDestroyed = false;

  constructor(roomId: string = "global", preferredId?: string) {
    this.roomId = (roomId || "global").trim().toUpperCase();
    this.id = preferredId || `pilot-${uuidv4().substring(0, 8)}`;
    this.connectBroker(0);
  }

  private connectBroker(brokerIndex: number) {
    if (this.isDestroyed || brokerIndex >= BROKERS.length) return;

    const brokerUrl = BROKERS[brokerIndex];
    const topicPrefix = `starshipx/v2/rooms/${encodeURIComponent(this.roomId)}`;

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId: `${this.id}-${Math.random().toString(36).substring(2, 6)}`,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 3000,
        will: {
          topic: `${topicPrefix}/leave`,
          payload: JSON.stringify({ id: this.id }),
          qos: 0,
          retain: false,
        },
      });

      this.client.on("connect", () => {
        this.connected = true;
        this.dispatch("connect");

        // Subscribe to all room events
        this.client?.subscribe(`${topicPrefix}/#`, (err) => {
          if (!err) {
            console.log(`[P2P Network] Connected to room [${this.roomId}] via ${brokerUrl}`);
            if (this.localPlayer) {
              this.publish("join", { player: this.localPlayer });
            }
          }
        });

        // Periodic presence heartbeat
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          if (this.connected && this.localPlayer) {
            this.publish("presence", { player: this.localPlayer });
          }
        }, 3000);
      });

      this.client.on("message", (topic: string, messageBuffer: Buffer) => {
        try {
          const action = topic.split("/").pop();
          const data = JSON.parse(messageBuffer.toString());

          // Ignore own messages
          if (data.senderId === this.id || data.id === this.id) {
            return;
          }

          this.handleRemoteMessage(action, data);
        } catch (e) {
          // Ignore malformed packets
        }
      });

      this.client.on("error", (err) => {
        console.warn(`[P2P Network] Broker error on ${brokerUrl}:`, err);
        if (!this.connected && brokerIndex + 1 < BROKERS.length) {
          this.client?.end(true);
          this.connectBroker(brokerIndex + 1);
        }
      });

      this.client.on("close", () => {
        this.connected = false;
        this.dispatch("disconnect");
      });
    } catch (e) {
      console.error("[P2P Network] Failed to initialize MQTT client:", e);
      if (brokerIndex + 1 < BROKERS.length) {
        this.connectBroker(brokerIndex + 1);
      }
    }
  }

  private publish(subTopic: string, payload: any) {
    if (!this.client || !this.connected) return;
    const topic = `starshipx/v2/rooms/${encodeURIComponent(this.roomId)}/${subTopic}`;
    const packet = {
      ...payload,
      senderId: this.id,
      timestamp: Date.now(),
    };
    try {
      this.client.publish(topic, JSON.stringify(packet), { qos: 0 });
    } catch (e) {
      // Ignored
    }
  }

  private handleRemoteMessage(action: string | undefined, data: any) {
    switch (action) {
      case "join": {
        const player = data.player;
        if (!player || !player.id) return;
        this.peers.set(player.id, player);
        this.dispatch("player:join", player);

        // Reply with our presence so the newly joined player sees us immediately
        if (this.localPlayer) {
          this.publish("presence", { player: this.localPlayer });
        }
        break;
      }

      case "presence": {
        const player = data.player;
        if (!player || !player.id) return;
        if (!this.peers.has(player.id)) {
          this.peers.set(player.id, player);
          this.dispatch("player:join", player);
        }
        break;
      }

      case "move": {
        if (data.id && data.position && data.quaternion) {
          this.dispatch("player:move", {
            id: data.id,
            position: data.position,
            quaternion: data.quaternion,
          });
        }
        break;
      }

      case "shoot": {
        this.dispatch("bullet", {
          id: data.id,
          position: data.position,
          velocity: data.velocity,
          type: data.type || "normal",
          ownerId: data.ownerId || data.senderId,
        });
        break;
      }

      case "damage": {
        if (data.targetId === this.id) {
          // We were hit by another player's laser/missile!
          if (this.localPlayer && !this.localPlayer.isDead) {
            const newHealth = Math.max(0, (this.localPlayer.health ?? 100) - (data.amount || 20));
            this.localPlayer.health = newHealth;
            this.dispatch("player:health", { id: this.id, health: newHealth });

            if (newHealth <= 0) {
              this.localPlayer.isDead = true;
              this.dispatch("player:die", { id: this.id });
              this.publish("die", { id: this.id, attackerId: data.attackerId });

              // Auto-respawn after 3 seconds
              setTimeout(() => {
                if (this.localPlayer && !this.isDestroyed) {
                  const spawn = generateSolarSpawnPoint();
                  this.localPlayer.isDead = false;
                  this.localPlayer.health = this.localPlayer.stats?.maxHealth || 100;
                  this.localPlayer.position = spawn.position;
                  this.localPlayer.quaternion = spawn.quaternion;

                  this.dispatch("player:respawn_self", {
                    health: this.localPlayer.health,
                    position: spawn.position,
                    quaternion: spawn.quaternion,
                  });
                  this.publish("respawn", {
                    player: this.localPlayer,
                  });
                }
              }, 3000);
            }
          }
        } else {
          // Another player took damage
          const peer = this.peers.get(data.targetId);
          if (peer) {
            peer.health = Math.max(0, (peer.health || 100) - (data.amount || 20));
            this.dispatch("player:health", { id: data.targetId, health: peer.health });
          }
        }
        break;
      }

      case "die": {
        if (data.id) {
          const peer = this.peers.get(data.id);
          if (peer) peer.isDead = true;
          this.dispatch("player:die", { id: data.id });
        }
        break;
      }

      case "respawn": {
        if (data.player && data.player.id) {
          this.peers.set(data.player.id, data.player);
          this.dispatch("player:join", data.player);
        }
        break;
      }

      case "leave": {
        if (data.id) {
          this.peers.delete(data.id);
          this.dispatch("player:leave", data.id);
          this.dispatch("player:left", data.id);
        }
        break;
      }
    }
  }

  public on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // If already connected and listener is for 'connect', invoke immediately
    if (event === "connect" && this.connected) {
      setTimeout(() => callback(), 0);
    }
  }

  public off(event: string, callback?: (...args: any[]) => void) {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const list = this.listeners.get(event);
      if (list) {
        this.listeners.set(event, list.filter((cb) => cb !== callback));
      }
    }
  }

  private dispatch(event: string, ...args: any[]) {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach((cb) => {
        try {
          cb(...args);
        } catch (e) {
          console.error(`Error in event listener '${event}':`, e);
        }
      });
    }
  }

  public emit(event: string, data?: any) {
    switch (event) {
      case "join": {
        const stats = getShipStats(data?.seed || "seed");
        this.localPlayer = {
          id: this.id,
          name: data?.name || "Piloto P2P",
          activeSeed: data?.seed || "seed",
          customParts: data?.customParts,
          position: data?.position || [0, 0, -2800],
          quaternion: data?.quaternion || [0, 0, 0, 1],
          health: stats.maxHealth,
          stats,
          isDead: false,
          roomId: this.roomId,
        };

        // Immediate local confirmation
        this.dispatch("join_success", this.localPlayer);
        this.dispatch("init", [this.localPlayer, ...Array.from(this.peers.values())]);

        // Broadcast to other players in room
        this.publish("join", { player: this.localPlayer });
        break;
      }

      case "move": {
        if (this.localPlayer && data) {
          this.localPlayer.position = data.position;
          this.localPlayer.quaternion = data.quaternion;
          this.publish("move", {
            id: this.id,
            position: data.position,
            quaternion: data.quaternion,
          });
        }
        break;
      }

      case "shoot": {
        this.publish("shoot", {
          id: data?.id || uuidv4(),
          position: data?.position,
          velocity: data?.velocity,
          type: data?.type || "normal",
          ownerId: this.id,
        });
        break;
      }

      case "damage": {
        this.publish("damage", {
          targetId: data?.targetId,
          attackerId: this.id,
          amount: data?.amount,
          bulletId: data?.bulletId,
        });
        break;
      }
    }
  }

  public disconnect() {
    this.isDestroyed = true;
    clearInterval(this.heartbeatInterval);
    if (this.client) {
      try {
        this.publish("leave", { id: this.id });
        this.client.end(true);
      } catch (e) {}
      this.client = null;
    }
    this.peers.clear();
    this.listeners.clear();
  }
}

export function createGameSocket(roomId: string = "global"): NetworkSocket {
  const isStaticHost = typeof window !== "undefined" && (
    window.location.hostname.includes("github.io") ||
    window.location.protocol === "file:" ||
    !window.location.port && !window.location.origin.includes(":3000")
  );

  if (isStaticHost) {
    console.log(`⚡ [Network] Connecting to Serverless P2P mesh for room [${roomId}]`);
    return new ServerlessMqttSocket(roomId);
  }

  // Attempt local Socket.io with fast failover
  try {
    const sock = io({
      timeout: 2500,
      reconnectionAttempts: 1,
    }) as unknown as NetworkSocket;
    return sock;
  } catch (e) {
    return new ServerlessMqttSocket(roomId);
  }
}
