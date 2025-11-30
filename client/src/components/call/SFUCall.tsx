import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
} from '@livekit/components-react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const LIVEKIT_WS_URL = import.meta.env.VITE_LIVEKIT_WS_URL;

interface SFUCallProps {
    roomId: string;
    username: string;
}

export default function SFUCall({ roomId, username }: SFUCallProps) {
    const navigate = useNavigate();
    const [token, setToken] = useState<string>('');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchToken = async () => {
            try {
                console.log('🔑 Fetching LiveKit token...', { SERVER_URL, roomId, username });
                const response = await axios.get(`${SERVER_URL}/api/livekit-token`, {
                    params: { roomId, userId: username },
                });
                console.log('✅ LiveKit token received:', response.data.token);
                setToken(response.data.token);
            } catch (err) {
                console.error('❌ Error fetching LiveKit token:', err);
                setError('Failed to connect to SFU server');
            }
        };

        fetchToken();
    }, [roomId, username]);

    const handleDisconnect = () => {
        navigate('/');
    };

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-950">
                <div className="card p-8 max-w-md text-center">
                    <div className="text-red-500 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-100 mb-2">Connection Error</h3>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button onClick={handleDisconnect} className="btn-primary">
                        Return to Lobby
                    </button>
                </div>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-950">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Connecting to SFU server...</p>
                </div>
            </div>
        );
    }

    console.log('🌐 Connecting to LiveKit:', LIVEKIT_WS_URL, 'Room:', roomId, 'User:', username);

    return (
        <div className="h-full bg-slate-950">
            <LiveKitRoom
                video={true}
                audio={true}
                token={token}
                connect={true}
                serverUrl={LIVEKIT_WS_URL}
                data-lk-theme="default"
                style={{ height: '100%' }}
                onDisconnected={handleDisconnect}
                onConnected={() => console.log('✅ Connected to LiveKit!')}
                onError={(error) => console.error('❌ LiveKit error:', error)}
            >
                {/* Use built-in VideoConference component for automatic grid layout */}
                <VideoConference />
                <RoomAudioRenderer />
            </LiveKitRoom>
        </div>
    );
}
