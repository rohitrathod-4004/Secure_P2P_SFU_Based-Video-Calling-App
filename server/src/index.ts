/**
 * Main Server - Express + Socket.IO for WebRTC signaling
 * Handles REST API and real-time WebRTC signaling
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { getRoom, joinRoom, leaveRoom } from './rooms';
import { createAccessToken } from './livekit';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

// ============================================================================
// REST API Endpoints
// ============================================================================

/**
 * POST /api/room - Join or create a room
 */
app.post('/api/room', (req, res) => {
    const { roomId, userId } = req.body;

    if (!roomId || !userId) {
        return res.status(400).json({ error: 'roomId and userId are required' });
    }

    try {
        const room = joinRoom(roomId, userId);
        res.json({
            roomId: room.id,
            mode: room.mode,
            participantsCount: room.participants.length,
        });
    } catch (error) {
        console.error('Error joining room:', error);
        res.status(500).json({ error: 'Failed to join room' });
    }
});

/**
 * GET /api/room/:roomId - Get room information
 */
app.get('/api/room/:roomId', (req, res) => {
    const { roomId } = req.params;
    const room = getRoom(roomId);

    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
        roomId: room.id,
        mode: room.mode,
        participantsCount: room.participants.length,
        participants: room.participants,
    });
});

/**
 * GET /api/livekit-token - Generate LiveKit access token for SFU mode
 */
app.get('/api/livekit-token', async (req, res) => {
    const { roomId, userId } = req.query;

    if (!roomId || !userId) {
        return res.status(400).json({ error: 'roomId and userId are required' });
    }

    try {
        const token = await createAccessToken(userId as string, roomId as string);
        res.json({ token });
    } catch (error) {
        console.error('Error creating LiveKit token:', error);
        res.status(500).json({ error: 'Failed to create access token' });
    }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// Socket.IO - WebRTC Signaling
// ============================================================================

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    /**
     * Handle room join
     */
    socket.on('join-room', ({ roomId, userId }) => {
        console.log(`User ${userId} joined room ${roomId}`);
        socket.join(roomId);

        // Track identity for disconnect cleanup
        socket.data.roomId = roomId;
        socket.data.userId = userId;

        // Get previous mode before joining
        const existingRoom = getRoom(roomId);
        const previousMode = existingRoom?.mode;

        const room = joinRoom(roomId, userId);

        // Check if mode changed
        if (previousMode && previousMode !== room.mode) {
            console.log(`🔄 Room ${roomId} mode changed: ${previousMode} → ${room.mode}`);
            io.to(roomId).emit('mode-changed', {
                roomId,
                oldMode: previousMode,
                newMode: room.mode,
                participants: room.participants
            });
        }

        io.to(roomId).emit('room-updated', {
            roomId,
            mode: room.mode,
            participants: room.participants
        });
    });

    /**
     * WebRTC Signaling - Offer
     */
    socket.on('webrtc-offer', ({ roomId, from, offer }) => {
        console.log('Forwarding WebRTC OFFER from', from);
        socket.to(roomId).emit('webrtc-offer', { from, offer });
    });

    /**
     * WebRTC Signaling - Answer
     */
    socket.on('webrtc-answer', ({ roomId, from, answer }) => {
        console.log('Forwarding WebRTC ANSWER from', from);
        socket.to(roomId).emit('webrtc-answer', { from, answer });
    });

    /**
     * WebRTC Signaling - ICE Candidate
     */
    socket.on('webrtc-ice-candidate', ({ roomId, from, candidate }) => {
        console.log('Forwarding ICE candidate from', from);
        socket.to(roomId).emit('webrtc-ice-candidate', { from, candidate });
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
        const { roomId, userId } = socket.data;
        if (roomId && userId) {
            // Get previous mode before leaving
            const existingRoom = getRoom(roomId);
            const previousMode = existingRoom?.mode;

            const room = leaveRoom(roomId, userId);

            // Check if mode changed (e.g., SFU → P2P when going from 3 to 2 users)
            if (room && previousMode && previousMode !== room.mode) {
                console.log(`🔄 Room ${roomId} mode changed: ${previousMode} → ${room.mode}`);
                io.to(roomId).emit('mode-changed', {
                    roomId,
                    oldMode: previousMode,
                    newMode: room.mode,
                    participants: room.participants
                });
            }

            io.to(roomId).emit('room-updated', {
                roomId,
                mode: room?.mode ?? 'p2p',
                participants: room?.participants ?? []
            });
            console.log('User left:', userId);
        }
    });
});

// ============================================================================
// Start Server
// ============================================================================

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Secure WebRTC Server (DTLS-SRTP)                             ║
║  Server running on http://localhost:${PORT}                        ║
║                                                                ║
║  REST API:                                                     ║
║    POST /api/room                                              ║
║    GET  /api/room/:roomId                                      ║
║    GET  /api/livekit-token                                     ║
║                                                                ║
║  WebSocket: Socket.IO enabled for signaling                   ║
╚════════════════════════════════════════════════════════════════╝
  `);
});
