# Secure Real-Time Media Communication using DTLS-SRTP

A modern, full-stack WebRTC application that demonstrates secure real-time media communication. The application intelligently switches between **Peer-to-Peer (P2P)** mode for 1:1 calls and **Selective Forwarding Unit (SFU)** mode for multi-party conferences.

## 🎯 Features

- **Hybrid Architecture**: Automatic switching between P2P and SFU based on participant count
  - **P2P Mode**: Direct peer-to-peer connection for 2 participants (optimal latency)
  - **SFU Mode**: LiveKit-powered SFU for 3+ participants (scalability)
- **End-to-End Security**: All media encrypted with DTLS-SRTP
- **Modern UI**: Clean, responsive interface built with React and TailwindCSS
- **Real-time Signaling**: Socket.IO for WebRTC signaling
- **NAT Traversal**: STUN/TURN support via Twilio

## 🏗️ Architecture

### Technology Stack

**Backend (server/)**
- Node.js + Express
- Socket.IO (WebRTC signaling)
- TypeScript
- LiveKit Server SDK

**Frontend (client/)**
- React 18
- Vite
- TypeScript
- TailwindCSS
- Socket.IO Client
- LiveKit Client SDK

### How It Works

1. **P2P Mode (≤ 2 participants)**
   - Direct WebRTC connection between peers
   - DTLS for key exchange
   - SRTP for encrypted media streams
   - Minimal latency

2. **SFU Mode (≥ 3 participants)**
   - LiveKit SFU server routes media
   - Each participant sends once, receives multiple streams
   - Better scalability than mesh topology
   - Media still encrypted end-to-end

3. **Automatic Mode Switching**
   - Server monitors participant count
   - Seamlessly transitions between modes
   - Clients reconfigure connections automatically

## 🔒 Security Notes

### DTLS-SRTP Encryption

- **DTLS (Datagram Transport Layer Security)**: Handles key exchange between peers
- **SRTP (Secure Real-time Transport Protocol)**: Encrypts media packets using keys from DTLS
- **End-to-End**: Even in SFU mode, the server only routes encrypted packets

### Network Security

- **STUN**: Discovers public IP addresses for NAT traversal
- **TURN**: Relays media when direct connection fails (encrypted relay)
- **WSS**: WebSocket connections use TLS in production

## 📦 Project Structure

```
secure-webrtc-app/
├── server/                 # Backend Node.js server
│   ├── src/
│   │   ├── index.ts       # Main server with Express + Socket.IO
│   │   ├── rooms.ts       # Room management logic
│   │   └── livekit.ts     # LiveKit token generation
│   ├── package.json
│   ├── tsconfig.json
│   └── .env               # Environment variables
│
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Lobby.tsx  # Room creation/joining
│   │   │   └── Call.tsx   # Call orchestration
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   └── AppShell.tsx
│   │   │   └── call/
│   │   │       ├── P2PCall.tsx   # P2P WebRTC implementation
│   │   │       └── SFUCall.tsx   # LiveKit SFU implementation
│   │   ├── webrtc/
│   │   │   └── config.ts  # ICE server configuration
│   │   ├── lib/
│   │   │   └── socket.ts  # Socket.IO client helper
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env               # Environment variables
│
└── README.md              # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **LiveKit Server** (for SFU mode)

### LiveKit Server Setup

You need a running LiveKit server for SFU mode. For local development:

1. **Download LiveKit Server**:
   ```bash
   # macOS
   brew install livekit
   
   # Or download from https://github.com/livekit/livekit/releases
   ```

2. **Run LiveKit Server**:
   ```bash
   livekit-server --dev
   ```

   This starts LiveKit on `http://localhost:7880` with default dev credentials:
   - API Key: `devkey`
   - API Secret: `secret`

### Backend Setup

1. **Navigate to server directory**:
   ```bash
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   
   Edit `server/.env`:
   ```env
   PORT=5000
   LIVEKIT_API_KEY=devkey
   LIVEKIT_API_SECRET=secret
   LIVEKIT_HOST=http://localhost:7880
   ```

4. **Start the server**:
   ```bash
   npm run dev
   ```

   Server will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to client directory**:
   ```bash
   cd client
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   
   Edit `client/.env`:
   ```env
   VITE_SERVER_URL=http://localhost:5000
   VITE_TWILIO_STUN_URL=stun:global.stun.twilio.com:3478
   VITE_TWILIO_TURN_URL=turn:global.turn.twilio.com:3478?transport=udp
   VITE_TWILIO_TURN_USERNAME=
   VITE_TWILIO_TURN_CREDENTIAL=
   VITE_LIVEKIT_WS_URL=ws://localhost:7880
   ```

   **Note**: TURN credentials are optional for local testing. For production, get credentials from [Twilio](https://www.twilio.com/stun-turn).

4. **Start the client**:
   ```bash
   npm run dev
   ```

   Client will run on `http://localhost:3000`

## 🎮 Usage

1. **Open the application**: Navigate to `http://localhost:3000`

2. **Create a room**:
   - Enter your name
   - Click "Create Room"
   - Share the generated room ID with others

3. **Join a room**:
   - Enter your name
   - Enter the room ID
   - Click "Join Room"

4. **Testing modes**:
   - **P2P**: Open 2 browser tabs/windows
   - **SFU**: Open 3+ browser tabs/windows
   - Watch the mode badge change automatically!

## 🔧 Configuration

### Environment Variables

#### Server (`server/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `LIVEKIT_API_KEY` | LiveKit API key | `devkey` |
| `LIVEKIT_API_SECRET` | LiveKit API secret | `secret` |
| `LIVEKIT_HOST` | LiveKit server URL | `http://localhost:7880` |

#### Client (`client/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SERVER_URL` | Backend server URL | `http://localhost:5000` |
| `VITE_TWILIO_STUN_URL` | STUN server URL | `stun:global.stun.twilio.com:3478` |
| `VITE_TWILIO_TURN_URL` | TURN server URL | `turn:global.turn.twilio.com:3478?transport=udp` |
| `VITE_TWILIO_TURN_USERNAME` | TURN username (optional) | - |
| `VITE_TWILIO_TURN_CREDENTIAL` | TURN credential (optional) | - |
| `VITE_LIVEKIT_WS_URL` | LiveKit WebSocket URL | `ws://localhost:7880` |

## 🧪 Testing

### Local Testing

1. **Start all services**:
   - LiveKit server: `livekit-server --dev`
   - Backend: `cd server && npm run dev`
   - Frontend: `cd client && npm run dev`

2. **Open multiple browser windows**:
   - Window 1: Create a room
   - Window 2: Join with the room ID
   - Window 3+: Join to test SFU mode

### Production Deployment

1. **Build the client**:
   ```bash
   cd client
   npm run build
   ```

2. **Build the server**:
   ```bash
   cd server
   npm run build
   ```

3. **Deploy**:
   - Host LiveKit on a cloud server
   - Deploy backend to Node.js hosting (Heroku, Railway, etc.)
   - Deploy frontend to static hosting (Vercel, Netlify, etc.)
   - Update environment variables with production URLs

## 📚 API Reference

### REST Endpoints

#### `POST /api/room`
Create or join a room.

**Request**:
```json
{
  "roomId": "ABC12345",
  "userId": "john_doe"
}
```

**Response**:
```json
{
  "roomId": "ABC12345",
  "mode": "p2p",
  "participantsCount": 1
}
```

#### `GET /api/room/:roomId`
Get room information.

**Response**:
```json
{
  "roomId": "ABC12345",
  "mode": "p2p",
  "participantsCount": 2,
  "participants": ["john_doe", "jane_doe"]
}
```

#### `GET /api/livekit-token`
Generate LiveKit access token for SFU mode.

**Query Parameters**:
- `roomId`: Room ID
- `userId`: User ID

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Socket.IO Events

#### Client → Server

- `join-room`: Join a room
  ```typescript
  { roomId: string, userId: string }
  ```

- `webrtc-offer`: Send WebRTC offer
  ```typescript
  { roomId: string, from: string, to?: string, offer: RTCSessionDescriptionInit }
  ```

- `webrtc-answer`: Send WebRTC answer
  ```typescript
  { roomId: string, from: string, to?: string, answer: RTCSessionDescriptionInit }
  ```

- `webrtc-ice-candidate`: Send ICE candidate
  ```typescript
  { roomId: string, from: string, to?: string, candidate: RTCIceCandidateInit }
  ```

#### Server → Client

- `room-updated`: Room state changed
  ```typescript
  { roomId: string, mode: 'p2p' | 'sfu', participants: string[] }
  ```

- `user-left`: User left the room
  ```typescript
  { userId: string }
  ```

## 🤝 Contributing

This is an academic project demonstrating WebRTC concepts. Feel free to fork and experiment!

## 📄 License

MIT License - feel free to use this project for learning and development.

## 🙏 Acknowledgments

- **WebRTC**: For enabling real-time communication in browsers
- **LiveKit**: For providing an excellent open-source SFU
- **Twilio**: For free STUN/TURN servers
- **React & Vite**: For modern frontend development
- **TailwindCSS**: For beautiful, responsive UI

## 📞 Support

For issues or questions:
1. Check the console logs (browser & server)
2. Verify all services are running
3. Ensure environment variables are configured correctly
4. Check browser permissions for camera/microphone

---

**Built with ❤️ for learning WebRTC and real-time communication**
#   S e c u r e _ P 2 P _ S F U _ B a s e d - V i d e o - C a l l i n g - A p p  
 