import React, {useState} from "react";

const MessageInput = ({ onMessageSubmit, isResponding, errorMessage }) => {
  const [message, setMessage] = useState("");


  const sendMessage = async (event) => {
    event.preventDefault();
    setMessage("");
    onMessageSubmit(message);
  };

  return (
    <div className="px-10 py-5">
      {errorMessage && <div className="text-red-400">{errorMessage}</div>}
      <form onSubmit={sendMessage} className="flex space-x-2">
        <input
          type="text"
          placeholder="Type a message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="flex-grow p-2 rounded border border-gray-300 bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isResponding}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
        >
          {isResponding ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;