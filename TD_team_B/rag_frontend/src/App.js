import logo from './logo.svg';
import './App.css';
import Chat from './chat/Chat';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";


function App() {

  const chat = () => (
    <Chat bearerToken="abcde"/>
  );

  return (
    <div>
      <Router>
        <div>
          <Routes>
            <Route path="/" element={chat()} />
            <Route path="/chat" element={chat()} />
            <Route path="/chat/conversation/:conversationId" element={chat()} />
          </Routes>
        </div>
      </Router>
    </div>
  );
}

export default App;
