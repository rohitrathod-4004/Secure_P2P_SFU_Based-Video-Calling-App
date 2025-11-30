import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { createSocket } from '../lib/socket';
import AppShell from '../components/Layout/AppShell';
import P2PCall from '../components/call/P2PCall';
import SFUCall from '../components/call/SFUCall';

type RoomMode = 'p2p' | 'sfu';

interface LocationState {
    username?: string;
    mode?: RoomMode;
}

export default function Call() {
    const { roomId } = useParams<{ roomId: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    const state = location.state as LocationState;
    const [username] = useState(state?.username || 'Anonymous');
    const [currentMode, setCurrentMode] = useState<RoomMode>(state?.mode || 'p2p');
    const [participants, setParticipants] = useState<string[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [showModeChange, setShowModeChange] = useState(false);

    useEffect(() => {
        if (!roomId) {
            navigate('/');
            return;
        }

        // Create and connect socket
        const newSocket = createSocket();
        newSocket.connect();

        newSocket.on('connect', () => {
            console.log('Socket connected');
            // Join the room
            newSocket.emit('join-room', { roomId, userId: username });
        });

        // Listen for room updates
        newSocket.on('room-updated', ({ mode, participants: newParticipants }) => {
            console.log('📢 Room updated event received:', { mode, participants: newParticipants });
            setCurrentMode(mode);
            setParticipants(newParticipants);
        });

        // Listen for mode changes specifically
        newSocket.on('mode-changed', ({ oldMode, newMode, participants: newParticipants }) => {
            console.log(`🔄 Mode changed: ${oldMode} → ${newMode}`);
            setShowModeChange(true);
            setTimeout(() => setShowModeChange(false), 5000);
            setCurrentMode(newMode);
            setParticipants(newParticipants);
        });

        // Listen for user leaving
        newSocket.on('user-left', ({ userId }) => {
            console.log('User left:', userId);
        });

        setSocket(newSocket);

        // Fallback: Fetch room info via REST API after a short delay
        setTimeout(async () => {
            try {
                const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
                const response = await fetch(`${serverUrl}/api/room/${roomId}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('📊 Fetched room info via REST:', data);
                    if (data.participants && data.participants.length > 0) {
                        setParticipants(data.participants);
                        setCurrentMode(data.mode);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch room info:', error);
            }
        }, 1000);

        // Cleanup on unmount
        return () => {
            newSocket.off('room-updated');
            newSocket.off('mode-changed');
            newSocket.off('user-left');
            newSocket.disconnect();
        };
    }, [roomId, username, navigate]);

    if (!socket || !roomId) {
        return (
            <AppShell>
                <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                        <p className="text-slate-400">Connecting...</p>
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="h-[calc(100vh-4rem)] flex flex-col">
                {/* Top Bar */}
                <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-100">Room: {roomId}</h2>
                                <p className="text-sm text-slate-400">
                                    {participants.length} participant{participants.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            {currentMode === 'p2p' ? (
                                <span className="badge-p2p">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <circle cx="10" cy="10" r="3" />
                                    </svg>
                                    P2P Mode
                                </span>
                            ) : (
                                <span className="badge-sfu">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                                    </svg>
                                    SFU Mode
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mode Change Banner */}
                {showModeChange && (
                    <div className="bg-blue-500/10 border-b border-blue-500/30 px-6 py-3">
                        <p className="text-blue-400 text-sm text-center">
                            ⚡ Room upgraded to {currentMode.toUpperCase()} mode for better scalability. Reconfiguring media…
                        </p>
                    </div>
                )}

                {/* Call Component */}
                <div className="flex-1 overflow-hidden">
                    {currentMode === 'p2p' ? (
                        <P2PCall key={`p2p-${roomId}`} roomId={roomId} username={username} socket={socket} />
                    ) : (
                        <SFUCall key={`sfu-${roomId}`} roomId={roomId} username={username} />
                    )}
                </div>
            </div>
        </AppShell>
    );
}
