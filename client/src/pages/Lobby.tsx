import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AppShell from '../components/Layout/AppShell';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export default function Lobby() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [roomId, setRoomId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Generate random 8-character alphanumeric room ID
    const generateRoomId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleCreateRoom = async () => {
        if (!username.trim()) {
            setError('Please enter your username');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const newRoomId = generateRoomId();
            const response = await axios.post(`${SERVER_URL}/api/room`, {
                roomId: newRoomId,
                userId: username.trim(),
            });

            // Navigate to room with state
            navigate(`/room/${newRoomId}`, {
                state: {
                    username: username.trim(),
                    mode: response.data.mode,
                },
            });
        } catch (err) {
            console.error('Error creating room:', err);
            setError('Failed to create room. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!username.trim()) {
            setError('Please enter your username');
            return;
        }

        if (!roomId.trim()) {
            setError('Please enter a room ID');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const normalizedRoomId = roomId.trim().toUpperCase();
            const response = await axios.post(`${SERVER_URL}/api/room`, {
                roomId: normalizedRoomId,
                userId: username.trim(),
            });

            // Navigate to room with state
            navigate(`/room/${normalizedRoomId}`, {
                state: {
                    username: username.trim(),
                    mode: response.data.mode,
                },
            });
        } catch (err) {
            console.error('Error joining room:', err);
            setError('Failed to join room. Please check the room ID and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppShell>
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
                <div className="w-full max-w-md">
                    {/* Main Card */}
                    <div className="card p-8 space-y-6">
                        {/* Header */}
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-bold text-slate-100">
                                Secure Real-Time Media Communication
                            </h2>
                            <p className="text-slate-400 text-sm">
                                DTLS-SRTP • WebRTC • P2P • SFU
                            </p>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
                            {/* Username Input */}
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                                    Your Name
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    className="input-field"
                                    placeholder="Enter your name"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
                                />
                            </div>

                            {/* Room ID Input */}
                            <div>
                                <label htmlFor="roomId" className="block text-sm font-medium text-slate-300 mb-2">
                                    Room ID <span className="text-slate-500">(optional for create)</span>
                                </label>
                                <input
                                    id="roomId"
                                    type="text"
                                    className="input-field uppercase"
                                    placeholder="Enter room ID to join"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value.trim().toUpperCase())}
                                    onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCreateRoom}
                                    disabled={loading}
                                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Creating...' : 'Create Room'}
                                </button>
                                <button
                                    onClick={handleJoinRoom}
                                    disabled={loading}
                                    className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Joining...' : 'Join Room'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* About Section */}
                    <div className="mt-6 p-6 card">
                        <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center">
                            <svg
                                className="w-4 h-4 mr-2 text-indigo-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            About This Application
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            This application demonstrates secure real-time media communication using{' '}
                            <span className="text-indigo-400 font-medium">DTLS-SRTP</span>. It uses{' '}
                            <span className="text-emerald-400 font-medium">peer-to-peer WebRTC</span> for
                            1:1 calls and automatically upgrades to an{' '}
                            <span className="text-blue-400 font-medium">SFU architecture (LiveKit)</span>{' '}
                            when more participants join, ensuring optimal performance and scalability.
                        </p>
                    </div>

                    {/* Features */}
                    <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="card p-3 text-center">
                            <div className="text-2xl mb-1">🔒</div>
                            <p className="text-xs text-slate-400">End-to-End Encrypted</p>
                        </div>
                        <div className="card p-3 text-center">
                            <div className="text-2xl mb-1">⚡</div>
                            <p className="text-xs text-slate-400">Low Latency</p>
                        </div>
                        <div className="card p-3 text-center">
                            <div className="text-2xl mb-1">📈</div>
                            <p className="text-xs text-slate-400">Auto Scaling</p>
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
