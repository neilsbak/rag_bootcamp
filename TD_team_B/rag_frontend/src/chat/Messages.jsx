import React, { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const Messages = ({
  messages,
  isResponding,
}) => {
  const chatContainerRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    const chatContainer = chatContainerRef.current;
    chatContainer.scrollTop = chatContainer.scrollHeight;
  };

  return (
    <div ref={chatContainerRef}>
      {messages.map(({ queryText, responseText }, index) => {
        let shownResponseMessage = responseText;
        if (index === messages.length - 1 && isResponding) {
          shownResponseMessage = shownResponseMessage ? shownResponseMessage + "  " : "...";
        }
        return (
          <div key={index}>
            <MessageRow message={queryText} isBot={false} />
            <MessageRow message={shownResponseMessage} isBot={true} />
          </div>
        );
      })}
    </div>
  );
};

const MessageRow = ({ message, isBot }) => {
  return (
    <div
      className={`p-4 flex ${isBot ? "" : "bg-gray-700"
        }`}
    >
      <div
        className={`${isBot ? "bg-green-500" : "bg-purple-400"
          } text-white p-2 text-sm font-medium rounded-full w-9 h-9 flex items-center justify-center`}
      >
        {isBot ? "Bot" : "You"}
      </div>
      <div className="ml-3 flex-1">
        <ReactMarkdown
          components={{ p: (props) => <p className="m-0">{props.children}</p> }}
          children={message}
          remarkPlugins={[remarkGfm]}
        />
      </div>
    </div>
  );
};

export default Messages;
