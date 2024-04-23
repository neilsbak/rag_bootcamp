import React, { useState } from "react";

function Sidebar({
  conversations,
  selectedConversation,
  onSelectConversation,
  onDeleteConversation,
  onNewChat,
}) {
  const [showTrashId, setShowTrashId] = useState(null);

  return (
    <div className="w-64 h-screenflex flex-col">
      <a href="/" className="px-5 pt-5 pb-3 block">
        <h2 className="text-lg font-bold">FundChat</h2>
      </a>
      <div className="mb-4 mx-5">
        <button
          className="w-full text-sm bg-blue-500 hover:bg-blue-700 text-white font-semibold p-2 px-4 rounded transition duration-150"
          onClick={onNewChat}
        >
          + New Chat
        </button>
      </div>
      <div className="flex-grow overflow-y-auto">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation)}
            onMouseEnter={() => setShowTrashId(conversation.id)}
            onMouseLeave={() => setShowTrashId(null)}
            className={`px-5 py-2 hover:bg-gray-700 transition duration-150 cursor-pointer ${
              selectedConversation?.id === conversation.id ? "bg-gray-700" : ""}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold">{conversation.fundName || "No Name"}:</div>
                <div className="text-sm truncate w-48">
                  {(conversation.messages ?? [])[0]?.queryText ||
                    (conversation.messages ?? [])[1]?.queryText ||
                    "No recent messages"}
                </div>
              </div>            
              {showTrashId === conversation.id && (
                <div
                  className="trash-icon"
                  onClick={() => onDeleteConversation(conversation.id)}
                >
                  <svg
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    height="1em"
                    width="1em"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
