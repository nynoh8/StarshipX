// Peer-to-Peer (P2P) WebRTC Mesh Manager for StarshipX Battle
// Uses zero API keys / zero external credentials.
// Connects peers directly using public STUN servers (stun:stun.l.google.com:19302)
// and WebRTC RTCDataChannels for ultra low-latency telemetry and combat.

import { Socket } from "socket.io-client";

export interface P2PPacket {
  type: "move" | "shoot" | "damage" | "chat" | "ping";
  senderId: string;
  payload: any;
  timestamp: number;
}

export type P2PStatus = "disconnected" | "connecting" | "p2p_direct" | "p2p_relay";

export class P2PMeshManager {
  private socket: Socket | null = null;
  private localPeerId: string = "";
  private peers: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private onMessageCallback: ((peerId: string, packet: P2PPacket) => void) | null = null;
  private onStatusChangeCallback: ((status: P2PStatus, peerCount: number) => void) | null = null;

  private iceConfig: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" }
    ],
  };

  public init(
    socket: Socket,
    localPeerId: string,
    onMessage: (peerId: string, packet: P2PPacket) => void,
    onStatusChange?: (status: P2PStatus, peerCount: number) => void
  ) {
    this.socket = socket;
    this.localPeerId = localPeerId;
    this.onMessageCallback = onMessage;
    this.onStatusChangeCallback = onStatusChange || null;

    this.setupSocketListeners();
    this.updateStatus();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // A new peer joined the room -> establish connection
    this.socket.on("p2p:peer-joined", async ({ peerId }: { peerId: string }) => {
      if (peerId === this.localPeerId || this.peers.has(peerId)) return;
      // We initiate offer to the new peer
      await this.createPeerConnection(peerId, true);
    });

    // Received signaling data (offer, answer, or candidate)
    this.socket.on("p2p:signal", async ({ fromPeerId, signal }: { fromPeerId: string; signal: any }) => {
      if (fromPeerId === this.localPeerId) return;

      try {
        let pc = this.peers.get(fromPeerId);
        if (!pc) {
          pc = await this.createPeerConnection(fromPeerId, false);
        }

        if (signal.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.socket?.emit("p2p:signal", {
            targetPeerId: fromPeerId,
            signal: answer,
          });
        } else if (signal.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.warn(`[P2P] Signaling error with peer ${fromPeerId}:`, err);
      }
    });

    // A peer left the room
    this.socket.on("p2p:peer-left", ({ peerId }: { peerId: string }) => {
      this.closePeer(peerId);
    });
  }

  private async createPeerConnection(peerId: string, isInitiator: boolean): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(this.iceConfig);
    this.peers.set(peerId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit("p2p:signal", {
          targetPeerId: peerId,
          signal: { candidate: event.candidate },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        this.closePeer(peerId);
      }
      this.updateStatus();
    };

    if (isInitiator) {
      // Create high-speed unreliable RTCDataChannel for game telemetry (no TCP head-of-line blocking)
      const dc = pc.createDataChannel("p2p_starship_mesh", {
        ordered: false,
        maxRetransmits: 0,
      });
      this.setupDataChannel(peerId, dc);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket?.emit("p2p:signal", {
          targetPeerId: peerId,
          signal: offer,
        });
      } catch (err) {
        console.error(`[P2P] Failed to create offer for ${peerId}:`, err);
      }
    } else {
      pc.ondatachannel = (event) => {
        this.setupDataChannel(peerId, event.channel);
      };
    }

    return pc;
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannel) {
    this.dataChannels.set(peerId, dc);

    dc.onopen = () => {
      console.log(`⚡ [P2P WebRTC] Direct P2P DataChannel open with peer: ${peerId}`);
      this.updateStatus();
    };

    dc.onclose = () => {
      this.dataChannels.delete(peerId);
      this.updateStatus();
    };

    dc.onerror = (err) => {
      console.warn(`[P2P] DataChannel error with ${peerId}:`, err);
    };

    dc.onmessage = (event) => {
      try {
        const packet: P2PPacket = JSON.parse(event.data);
        if (this.onMessageCallback) {
          this.onMessageCallback(peerId, packet);
        }
      } catch (e) {
        // Ignored
      }
    };
  }

  private closePeer(peerId: string) {
    const dc = this.dataChannels.get(peerId);
    if (dc) {
      try { dc.close(); } catch {}
      this.dataChannels.delete(peerId);
    }
    const pc = this.peers.get(peerId);
    if (pc) {
      try { pc.close(); } catch {}
      this.peers.delete(peerId);
    }
    this.updateStatus();
  }

  public broadcast(type: P2PPacket["type"], payload: any): boolean {
    const packet: P2PPacket = {
      type,
      senderId: this.localPeerId,
      payload,
      timestamp: Date.now(),
    };
    const jsonStr = JSON.stringify(packet);
    let sentCount = 0;

    this.dataChannels.forEach((dc) => {
      if (dc.readyState === "open") {
        try {
          dc.send(jsonStr);
          sentCount++;
        } catch (e) {
          // Fallback handled by caller
        }
      }
    });

    return sentCount > 0;
  }

  public getDirectPeerCount(): number {
    let openCount = 0;
    this.dataChannels.forEach((dc) => {
      if (dc.readyState === "open") openCount++;
    });
    return openCount;
  }

  private updateStatus() {
    const count = this.getDirectPeerCount();
    let status: P2PStatus = "disconnected";
    if (count > 0) {
      status = "p2p_direct";
    } else if (this.peers.size > 0) {
      status = "connecting";
    } else {
      status = "p2p_relay";
    }
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(status, count);
    }
  }

  public destroy() {
    this.dataChannels.forEach((dc) => {
      try { dc.close(); } catch {}
    });
    this.dataChannels.clear();
    this.peers.forEach((pc) => {
      try { pc.close(); } catch {}
    });
    this.peers.clear();
  }
}

export const p2pMesh = new P2PMeshManager();
