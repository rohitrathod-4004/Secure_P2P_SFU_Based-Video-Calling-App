/**
 * Socket.IO Client Helper
 */

import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export function createSocket(): Socket {
    return io(SERVER_URL, {
        autoConnect: false,
    });
}
