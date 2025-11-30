import { Routes, Route } from 'react-router-dom';
import Lobby from './pages/Lobby';
import Call from './pages/Call';

function App() {
    return (
        <Routes>
            <Route path="/" element={<Lobby />} />
            <Route path="/room/:roomId" element={<Call />} />
        </Routes>
    );
}

export default App;
