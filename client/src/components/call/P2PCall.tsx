import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { rtcConfig } from '../../webrtc/config';

interface P2PCallProps {
    roomId: string;
    username: string;
    socket: Socket;
}

export default function P2PCall({ roomId, username, socket }: P2PCallProps) {
    const navigate = useNavigate();
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const isInitiatorRef = useRef(false);
    const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);

    // 🔹 Attach local stream to video element whenever it changes
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // 🔹 Attach remote stream to video element whenever it changes
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            // try to play explicitly (some browsers need this)
            remoteVideoRef.current
                .play()
                .then(() => console.log('✅ Remote video playing'))
                .catch((err) => console.error('❌ Error playing remote video:', err));
        }
    }, [remoteStream]);

    useEffect(() => {
        let mounted = true;

        const createOffer = async (pc: RTCPeerConnection) => {
            try {
                console.log('📞 Creating offer');
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                socket.emit('webrtc-offer', {
                    roomId,
                    from: username,
                    offer,
                });
                console.log('📤 Sent offer');
            } catch (error) {
                console.error('❌ Error creating offer:', error);
            }
        };

        const setupSignaling = (pc: RTCPeerConnection) => {
            socket.on('webrtc-offer', async ({ from, offer }: any) => {
                if (from === username) return;
                console.log('📨 Received offer from', from);

                // mark that negotiation started so we don't create our own offer
                isInitiatorRef.current = true;

                try {
                    // Check if we need to rollback
                    const isStable =
                        pc.signalingState === 'stable' ||
                        (pc.signalingState === 'have-local-offer' && pc.currentRemoteDescription);

                    if (!isStable) {
                        console.log('⚠️ Rolling back to stable state');
                        await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
                    }

                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    console.log('✅ Set remote description (offer)');

                    // Process any pending ICE candidates
                    while (pendingCandidatesRef.current.length > 0) {
                        const candidate = pendingCandidatesRef.current.shift();
                        if (candidate) {
                            console.log('🧊 Adding queued ICE candidate');
                            await pc.addIceCandidate(candidate);
                        }
                    }

                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    socket.emit('webrtc-answer', {
                        roomId,
                        from: username,
                        answer,
                    });
                    console.log('📤 Sent answer');
                } catch (error) {
                    console.error('❌ Error handling offer:', error);
                }
            });

            socket.on('webrtc-answer', async ({ from, answer }: any) => {
                if (from === username) return;
                console.log('📨 Received answer from', from);

                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                    console.log('✅ Set remote description (answer)');

                    // Process any pending ICE candidates
                    while (pendingCandidatesRef.current.length > 0) {
                        const candidate = pendingCandidatesRef.current.shift();
                        if (candidate) {
                            console.log('🧊 Adding queued ICE candidate');
                            await pc.addIceCandidate(candidate);
                        }
                    }
                } catch (error) {
                    console.error('❌ Error handling answer:', error);
                }
            });

            socket.on('webrtc-ice-candidate', async ({ from, candidate }: any) => {
                if (from === username) return;

                try {
                    const iceCandidate = new RTCIceCandidate(candidate);

                    // Only add ICE candidate if remote description is set
                    if (pc.remoteDescription) {
                        await pc.addIceCandidate(iceCandidate);
                        console.log('🧊 Added ICE candidate');
                    } else {
                        // Queue it for later
                        console.log('🧊 Queuing ICE candidate (no remote description yet)');
                        pendingCandidatesRef.current.push(iceCandidate);
                    }
                } catch (error) {
                    console.error('❌ Error adding ICE candidate:', error);
                }
            });

            socket.on('room-updated', ({ participants }: any) => {
                console.log('👥 Room updated, participants:', participants.length);
                // If another user joined and we haven't started negotiation, create offer
                if (participants.length === 2 && !isInitiatorRef.current) {
                    console.log('👤 Second user joined, initiating connection');
                    isInitiatorRef.current = true;
                    setTimeout(() => createOffer(pc), 500);
                }
            });
        };

        const checkRoomStateAndInitiate = async (pc: RTCPeerConnection) => {
            try {
                const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
                const response = await fetch(`${serverUrl}/api/room/${roomId}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('📊 Room state on mount:', data);

                    // If we're joining a room with 1 other participant, we should initiate
                    if (data.participants && data.participants.length === 2 && !isInitiatorRef.current) {
                        console.log('👤 Joining as second user, will initiate connection');
                        isInitiatorRef.current = true;
                        // Small delay to ensure both peers are ready
                        setTimeout(() => {
                            // Only create offer if we're still in a stable state
                            if (pc.signalingState === 'stable') {
                                createOffer(pc);
                            } else {
                                console.log('⚠️ Skipping offer creation - peer connection not in stable state:', pc.signalingState);
                            }
                        }, 1000);
                    }
                }
            } catch (error) {
                console.error('❌ Error checking room state:', error);
            }
        };

        const initializeMedia = async () => {
            try {
                console.log('🎥 Requesting media access...');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });

                if (!mounted) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                console.log('✅ Media access granted');
                setLocalStream(stream);

                console.log('🔗 Creating peer connection');
                const pc = new RTCPeerConnection(rtcConfig);
                peerConnectionRef.current = pc;

                // add local tracks
                stream.getTracks().forEach((track) => {
                    console.log('➕ Adding local track:', track.kind);
                    pc.addTrack(track, stream);
                });

                // ICE candidates
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log('🧊 Sending ICE candidate');
                        socket.emit('webrtc-ice-candidate', {
                            roomId,
                            from: username,
                            candidate: event.candidate,
                        });
                    }
                };

                // remote tracks
                pc.ontrack = (event) => {
                    console.log('📺 Received remote track:', event.track.kind);
                    console.log('📺 Track readyState:', event.track.readyState);
                    console.log('📺 Event streams:', event.streams);

                    // Use the first stream
                    if (event.streams && event.streams[0]) {
                        const remoteMediaStream = event.streams[0];
                        console.log(
                            '✅ Setting remote stream',
                            remoteMediaStream.getTracks().map((t) => `${t.kind}: ${t.readyState}`),
                        );
                        setRemoteStream(remoteMediaStream);
                        setIsConnecting(false);
                    }
                };

                pc.onconnectionstatechange = () => {
                    console.log('🔗 Connection state:', pc.connectionState);
                    if (pc.connectionState === 'connected') {
                        console.log('✅ WebRTC connection established!');
                    } else if (pc.connectionState === 'failed') {
                        console.error('❌ Connection failed');
                    }
                };

                pc.oniceconnectionstatechange = () => {
                    console.log('🧊 ICE state:', pc.iceConnectionState);
                };

                setupSignaling(pc);

                // Check room state on mount to handle case where we're joining an existing user
                checkRoomStateAndInitiate(pc);
            } catch (error) {
                console.error('❌ Error initializing media:', error);
                alert('Failed to access camera/microphone');
            }
        };

        initializeMedia();

        return () => {
            mounted = false;
            if (localStream) {
                localStream.getTracks().forEach((track) => track.stop());
            }
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
            socket.off('webrtc-offer');
            socket.off('webrtc-answer');
            socket.off('webrtc-ice-candidate');
            socket.off('room-updated');
        };
    }, [roomId, username, socket]);

    const toggleMute = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    const endCall = () => {
        if (localStream) {
            localStream.getTracks().forEach((track) => track.stop());
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }
        navigate('/');
    };

    return (
        <div className="h-full flex flex-col bg-slate-950">
            <div className="flex-1 p-6 grid grid-cols-2 gap-6 overflow-hidden min-h-0">
                {/* Local Video */}
                <div className="relative card overflow-hidden h-full">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm px-3 py-1 rounded-lg">
                        <p className="text-sm font-medium text-slate-100">{username} (You)</p>
                    </div>
                    {isVideoOff && (
                        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <span className="text-3xl">👤</span>
                                </div>
                                <p className="text-slate-400">Camera Off</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Remote Video */}
                <div className="relative card overflow-hidden h-full">
                    {remoteStream ? (
                        <>
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm px-3 py-1 rounded-lg">
                                <p className="text-sm font-medium text-slate-100">Remote Participant</p>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900">
                            <div className="text-center">
                                {isConnecting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                                        <p className="text-slate-400">Waiting for participant...</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <span className="text-3xl">👤</span>
                                        </div>
                                        <p className="text-slate-400">No participant yet</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Control Bar */}
            <div className="bg-slate-900/50 backdrop-blur-sm border-t border-slate-800 px-6 py-4">
                <div className="flex items-center justify-center space-x-4">
                    <button
                        onClick={toggleMute}
                        className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'
                            }`}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? (
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'
                            }`}
                        title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                    >
                        {isVideoOff ? (
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={endCall}
                        className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition-all"
                        title="End call"
                    >
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
