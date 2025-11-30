/**
 * Room Manager - In-memory room state management
 * Handles room creation, participant joining/leaving, and mode switching
 */

export type RoomMode = 'p2p' | 'sfu';

export interface Room {
    id: string;
    mode: RoomMode;
    participants: string[]; // userIds
}

// In-memory storage
const rooms = new Map<string, Room>();

/**
 * Get a room by ID
 */
export function getRoom(roomId: string): Room | undefined {
    return rooms.get(roomId);
}

/**
 * Create a new room with initial participant
 */
export function createRoom(roomId: string, userId: string): Room {
    const room: Room = {
        id: roomId,
        mode: 'p2p',
        participants: [userId],
    };
    rooms.set(roomId, room);
    return room;
}

/**
 * Add a participant to a room (creates room if it doesn't exist)
 * Automatically switches mode based on participant count
 */
export function joinRoom(roomId: string, userId: string): Room {
    let room = rooms.get(roomId);

    if (!room) {
        // Create new room
        room = createRoom(roomId, userId);
    } else {
        // Add participant if not already in room
        if (!room.participants.includes(userId)) {
            room.participants.push(userId);
        }
    }

    // Update mode based on participant count
    if (room.participants.length <= 2) {
        room.mode = 'p2p';
    } else {
        room.mode = 'sfu';
    }

    return room;
}

/**
 * Remove a participant from a room
 * Returns null if room is empty (should be deleted)
 */
export function leaveRoom(roomId: string, userId: string): Room | null {
    const room = rooms.get(roomId);

    if (!room) {
        return null;
    }

    // Remove participant
    room.participants = room.participants.filter(id => id !== userId);

    // If no participants remain, delete room
    if (room.participants.length === 0) {
        rooms.delete(roomId);
        return null;
    }

    // Update mode based on remaining participants
    if (room.participants.length <= 2) {
        room.mode = 'p2p';
    } else {
        room.mode = 'sfu';
    }

    return room;
}

/**
 * Get all rooms (for debugging/monitoring)
 */
export function getAllRooms(): Room[] {
    return Array.from(rooms.values());
}
