import { Room, RoomServiceClient, AccessToken } from "livekit-server-sdk";
import { v4 as uuidv4 } from "uuid";

const livekitUrl = process.env.LIVEKIT_URL || "ws://localhost:7880";
const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
const apiSecret = process.env.LIVEKIT_API_SECRET || "secret";

export class LiveKitRoomManager {
  constructor() {
    try {
      this.roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
      this.enabled = true;
    } catch (err) {
      console.warn("LiveKit RoomService init failed, running in mock mode:", err.message);
      this.roomService = null;
      this.enabled = false;
    }
    this.activeRooms = new Map();
  }

  /**
   * Create a new LiveKit room for a call
   */
  async createRoom(callId) {
    const roomName = `call-${callId}`;
    
    if (!this.enabled || !this.roomService) {
      console.log(`📺 Mock room created: ${roomName} (LiveKit unavailable)`);
      this.activeRooms.set(callId, roomName);
      return roomName;
    }
    
    try {
      await this.roomService.createRoom({
        name: roomName,
        emptyTimeout: 300, // 5 minutes
        maxParticipants: 2, // caller + agent
      });
      
      console.log(`📺 Created LiveKit room: ${roomName}`);
      this.activeRooms.set(callId, roomName);
      return roomName;
    } catch (err) {
      if (err.message?.includes("already exists")) {
        console.log(`📺 Room ${roomName} already exists, reusing`);
        this.activeRooms.set(callId, roomName);
        return roomName;
      }
      console.warn(`Failed to create LiveKit room, using mock:`, err.message);
      this.activeRooms.set(callId, roomName);
      return roomName;
    }
  }

  /**
   * Generate access token for a participant
   */
  generateToken(roomName, participantName) {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
    });
    
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    return at.toJwt();
  }

  /**
   * Clean up room after call ends
   */
  async deleteRoom(callId) {
    const roomName = this.activeRooms.get(callId);
    if (!roomName) return;

    if (!this.enabled || !this.roomService) {
      this.activeRooms.delete(callId);
      console.log(`🗑️ Mock room deleted: ${roomName}`);
      return;
    }

    try {
      await this.roomService.deleteRoom(roomName);
      this.activeRooms.delete(callId);
      console.log(`🗑️ Deleted LiveKit room: ${roomName}`);
    } catch (err) {
      this.activeRooms.delete(callId);
      console.warn(`Failed to delete room ${roomName}:`, err.message);
    }
  }

  /**
   * List active rooms
   */
  async listRooms() {
    const rooms = await this.roomService.listRooms();
    return rooms;
  }
}

export const roomManager = new LiveKitRoomManager();

