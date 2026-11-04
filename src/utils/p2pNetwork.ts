import mqtt, { MqttClient } from "mqtt";
import { io } from "socket.io-client";
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

// Public, zero-cost, ultra-reliable MQTT WebSocket brokers
const BROKERS = [
  "wss://broker.emqx.io:8084/mqtt",
  "wss://broker.hivemq.com:8884/mqtt",
];

export class ServerlessMqttSocket implements NetworkSocket {
  public id: string;
  public connected: boolean = false;
  private client: MqttClient | null = null;
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();
  private roomId: string = "GLOBAL";
  private localPlayer: any = null;
  private peers: Map<string, any> = new Map();
  private heartbeatInterval: any = null;
  private isDestroyed = false;

  constructor(roomId: string = "GLOBAL", preferredId?: string) {
    this.roomId = (roomId || "GLOBAL").trim().toUpperCase();
    this.id = preferredId || `pilot-${uuidv4().substring(0, 8)}`;
    this.connectBroker(0);
  }

  private connectBroker(brokerIndex: number) {
    if (this.isDestroyed || brokerIndex >= BROKERS.length) return;

    const brokerUrl = BROKERS[brokerIndex];
    const topicPrefix = `starshipx/v4/rooms/${encodeURIComponent(this.roomId)}`;

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId: `${this.id}-${Math.random().toString(36).substring(2, 7)}`,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 2000,
        keepalive: 30,
        will: {
          topic: `${topicPrefix}/leave`,
          payload: JSON.stringify({ id: this.id }),
          qos: 0,
          retain: false,
        },
      });

      this.client.on("connect", () => {
        this.connected = true;
        console.log(`⚡ [P2P Network] Connected to room [${this.roomId}] as [${this.id}] via ${brokerUrl}`);
        this.dispatch("connect");

        // Subscribe to all events in this room
        this.client?.subscribe(`${topicPrefix}/#`, { qos: 0 }, (err) => {
          if (!err) {
            console.log(`📡 [P2P Network] Subscribed to room [${this.roomId}]`);
            if (this.localPlayer) {
              this.publish("join", { player: this.localPlayer });
            }
          }
        });

        // Periodic presence heartbeat every 2.0s so all players continuously see each other
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          if (this.connected && this.localPlayer) {
            this.publish("presence", { player: this.localPlayer });
          }
        }, 2000);
      });

      this.client.on("message", (topic: string, messagePayload: any) => {
        try {
          const action = topic.split("/").pop();
          let jsonString = "";

          // Cross-platform binary decode for browser Uint8Array and Node Buffer
          if (typeof messagePayload === "string") {
            jsonString = messagePayload;
          } else if (typeof TextDecoder !== "undefined") {
            jsonString = new TextDecoder("utf-8").decode(messagePayload);
          } else {
            jsonString = messagePayload.toString();
          }

          const data = JSON.parse(jsonString);

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
    const topic = `starshipx/v4/rooms/${encodeURIComponent(this.roomId)}/${subTopic}`;
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
        const rawPlayer = data.player;
        if (!rawPlayer || !rawPlayer.id) return;
        const player = {
          ...rawPlayer,
          activeSeed: rawPlayer.activeSeed || rawPlayer.seed || "seed",
          position: rawPlayer.position || [0, 0, -2800],
          quaternion: rawPlayer.quaternion || [0, 0, 0, 1],
          name: rawPlayer.name || "Piloto Amigo",
          health: rawPlayer.health ?? 100,
          isDead: false,
          isNPC: false,
        };

        this.peers.set(player.id, player);
        this.dispatch("player:join", player);

        // Immediate reply with our presence so the newcomer sees us right away
        if (this.localPlayer) {
          this.publish("presence", { player: this.localPlayer });
        }
        break;
      }

      case "presence": {
        const rawPlayer = data.player;
        if (!rawPlayer || !rawPlayer.id) return;
        const player = {
          ...rawPlayer,
          activeSeed: rawPlayer.activeSeed || rawPlayer.seed || "seed",
          position: rawPlayer.position || [0, 0, -2800],
          quaternion: rawPlayer.quaternion || [0, 0, 0, 1],
          name: rawPlayer.name || "Piloto Amigo",
          health: rawPlayer.health ?? 100,
          isDead: false,
          isNPC: false,
        };

        this.peers.set(player.id, player);
        this.dispatch("player:join", player);
        break;
      }

      case "move": {
        if (data.id && data.position && data.quaternion) {
          // If we missed their join packet, add them automatically
          if (!this.peers.has(data.id)) {
            const peer = {
              id: data.id,
              name: data.name || "Piloto Amigo",
              activeSeed: data.activeSeed || "seed",
              position: data.position,
              quaternion: data.quaternion,
              health: 100,
              isDead: false,
              isNPC: false,
            };
            this.peers.set(data.id, peer);
            this.dispatch("player:join", peer);
          }

          this.dispatch("player:move", {
            id: data.id,
            position: data.position,
            quaternion: data.quaternion,
          });
        }
        break;
      }

      case "shoot": {
        const bulletData = {
          id: data.id,
          position: data.position,
          velocity: data.velocity,
          type: data.type || "normal",
          ownerId: data.ownerId || data.senderId,
        };
        // Deliver to BulletsManager!
        this.dispatch("bullet:new", bulletData);
        this.dispatch("bullet", bulletData);
        break;
      }

      case "damage": {
        if (data.targetId === this.id) {
          // We were hit by an opponent's shot
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
                  this.publish("respawn", { player: this.localPlayer });
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
            name: this.localPlayer.name,
            activeSeed: this.localPlayer.activeSeed,
            position: data.position,
            quaternion: data.quaternion,
          });
        }
        break;
      }

      case "shoot": {
        const bulletPayload = {
          id: data?.id || uuidv4(),
          position: data?.position,
          velocity: data?.velocity,
          type: data?.type || "normal",
          ownerId: this.id,
        };
        // 1. Immediately spawn laser/missile locally so the player sees what they shoot!
        this.dispatch("bullet:new", bulletPayload);
        this.dispatch("bullet", bulletPayload);

        // 2. Broadcast laser/missile to everyone else in the room!
        this.publish("shoot", bulletPayload);
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

export function createGameSocket(roomId: string = "GLOBAL"): NetworkSocket {
  console.log(`⚡ [Network] Connecting to Serverless P2P mesh for room [${roomId}] via EMQX`);
  return new ServerlessMqttSocket(roomId);
}
