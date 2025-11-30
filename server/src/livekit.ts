/**
 * LiveKit Helper - Generate access tokens for SFU mode
 */

import { AccessToken } from 'livekit-server-sdk';

/**
 * Create a LiveKit access token for a user to join a room
 */
export async function createAccessToken(identity: string, roomName: string): Promise<string> {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
        throw new Error('LiveKit API key and secret must be configured in environment variables');
    }

    const at = new AccessToken(apiKey, apiSecret, {
        identity,
    });

    // Grant permission to join the specified room
    at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
    });

    return await at.toJwt();
}
