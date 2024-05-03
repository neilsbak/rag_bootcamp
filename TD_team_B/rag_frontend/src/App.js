import './App.css';
import React, { useState, useEffect, createContext } from "react";
import Chat from './chat/Chat';
import Settings, { SettingsProvider } from './settings/Settings';
import defaultSettings from './settings/defaultSettings';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

function App() {

  const [showSettings, setShowSettings] = useState(false);

  const toggleSettings = () => setShowSettings(!showSettings);

  const chat = () => (
    <Chat bearerToken="abcde" onToggleSettings={toggleSettings} />
  );

  return (
    <SettingsProvider>
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
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <Settings settings={settings} onChange={handleUpdateSettings} onClose={toggleSettings} />
          </div>
        )}
      </div>
    </SettingsProvider>
  );
}

export default App;
