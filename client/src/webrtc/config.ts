/**
 * WebRTC Configuration - ICE servers (STUN/TURN)
 */

export const rtcConfig: RTCConfiguration = {
    iceServers: [
        // Google's public STUN servers (always available)
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};
