import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Messages from "./Messages";
import Sidebar from "./Sidebar";
import DocumentUpload from "./DocumentUpload";
import { addMessage, getConversations, deleteConversation, addConversation } from "./chatdb";
import FundOverview from "./FundOverview";
import MessageInput from "./MessageInput";

const startingMessages = [
];

function newConversation() {
  return {
    messages: [],
    documents: [],
    created: new Date().getTime(),
  };
}

function Chat({ bearerToken, onMissingBearerToken, onToggleSettings }) {
  const { settings } = useContext(SettingsContext);
  const { conversationId: cid } = useParams();
  const conversationId = cid == null ? null : parseInt(cid);
  const navigate = useNavigate();

  const [messages, setMessages] = useState(startingMessages);

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);
  const [websocket, setWebsocket] = useState(null);
  const [isWebsocketReady, setIsWebsocketReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const chatContainerRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer != null) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  };
  
  useEffect(() => {
    getConversations().then((conversations) => {
      setConversations(conversations);
      if (conversationId) {
        const conversation = conversations.find((c) => c.id === conversationId);
        setSelectedConversation(conversation);
        setMessages(
          (conversation?.messages ?? [])
        );
      } else {
        setSelectedConversation(
          newConversation()
        );
        setMessages(startingMessages);
      }
      setIsLoading(false);
    });
  }, [conversationId]);

  const createWebsocket = () => {
    const ws = new WebSocket(
      `${(
        process.env.REACT_APP_BASE_URL ||
        window.location.protocol +
        "//" +
        window.location.hostname +
        (window.location.port ? `:${window.location.port}` : "")
      ).replace(/^http/, "ws")}/ws_chat`
    );
    return ws;
  };

  useEffect(() => {
    setSelectedConversationId(selectedConversation?.id);
  }, [selectedConversation]);

  useEffect(() => {
    if (!bearerToken || !selectedConversationId) {
      return;
    }
    setErrorMessage("");
    setIsResponding(false);
    setIsWebsocketReady(false);
    const ws = createWebsocket();
    setWebsocket(ws);
    return () => {
      console.log("cleanup!!");
      ws.close();
    };
  }, [bearerToken, selectedConversationId]);

  function updateMessages(prevMessages, message, sources) {
    const updatedMessages = [...prevMessages];
    const updatedMessage = { responseText: "", sources: [], ...updatedMessages[updatedMessages.length - 1] };
    updatedMessage.responseText += message;
    if (sources) {
      updatedMessage.sources = sources
    }
    updatedMessages[updatedMessages.length - 1] = updatedMessage;
    return updatedMessages;
  }


  const setupWebsocket = (websocket) => {
    if (!websocket) {
      return;
    }
    websocket.onopen = (event) => {
      websocket.send(
        JSON.stringify({
          bearer_token: bearerToken,
          history:
            selectedConversation.messages?.map((m) => [
              m.queryText,
              m.responseText,
            ]) ?? [],
        })
      );
      setIsWebsocketReady(true);
    };

    websocket.onmessage = async function (event) {
      const json = JSON.parse(event.data);
      console.log(`message: ${JSON.stringify(json)}`);
      if (json.type === "error") {
        console.log("ERROR: " + event.data);
        let errorMessage = json.mesage || "Unknown Error";
        if (json.message === "401") {
          errorMessage = "Error: Invalid Passcode";
          onMissingBearerToken();
        }
        setErrorMessage(errorMessage);
        setIsResponding(false);
      } else if (json.type === "end") {
        setMessages((previousMessages) => {
          const lastMessage = previousMessages[previousMessages.length - 1];
          addMessage(
            selectedConversation,
            lastMessage,
          ).then(conversation => {
            getConversations().then(conversations => {
              setConversations(conversations);
              setSelectedConversation(conversation);
              setIsResponding(false);
            })
          });
          return previousMessages
        });
      } else if (json.type === "stream") {
        if (json.sender === "you") {
          setMessages((prevMessages) => {
            return prevMessages.concat([{ queryText: json.message, responseText: "", sources: [] }]);
          });
        } else {
          setMessages((prevMessages) => {
            return updateMessages(prevMessages, json.message);
          });
        }
      } else if (json.type === "citation") {
        // Extract and convert metadata into objects
        let sources = JSON.parse(json.message);
        setMessages((prevMessages) => {
          return updateMessages(prevMessages, "", sources);
        });
      }
    };

    websocket.onerror = (event) => {
      console.log(`Error: ${JSON.stringify(event)}`);
      setIsResponding(false);
      setErrorMessage(`Connection Error`);
    };
  };

  const handleWebsocketMessageSubmit = (queryText) => {
    setErrorMessage("");
    if (!queryText) {
      return;
    }
    if (websocket.readyState === websocket.OPEN) {
      setIsResponding(true);
      websocket.send(queryText);
    } else {
      const ws = createWebsocket();
      setIsWebsocketReady(false);
      setIsResponding(false);
      setWebsocket(ws);
      setTimeout(() => {
        if (ws.readyState === websocket.OPEN) {
          setIsResponding(true);
          ws.send(queryText);
        } else {
          setErrorMessage(`Connection Error`);
        }
      }, 2000);
    }
  };

  const onSelectConversation = (conversation) => {
    if (conversation == null) {
      navigate('/chat');
    } else if (conversation.id !== selectedConversation.id) {
      navigate(`/chat/conversation/${conversation.id}`);
    }
  };

  const onDeleteConversation = async (conversationId) => {
    const updatedConversations = await deleteConversation(conversationId);
    setConversations(updatedConversations);
    if (selectedConversation.id === conversationId) {
      setSelectedConversation(newConversation());
      setMessages(startingMessages);
      navigate('/chat');
    }
  };

  const onNewChat = () => navigate("/chat/");

  const onUploadComplete = async (documentNames, fundName, fundOverview) => {
    const conversation = await addConversation(
      { ...selectedConversation, documents: documentNames, fundName: fundName, fundOverview: fundOverview, messages: []}
    );
    setConversations(await getConversations());
    setSelectedConversation(conversation);
  };

  setupWebsocket(websocket);
  return (
    <div className="flex bg-gray-800 text-white ">
      <div className="bg-gray-900">
      <Sidebar
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={onSelectConversation}
        onDeleteConversation={onDeleteConversation}
        onNewChat={onNewChat}
        onToggleSettings={onToggleSettings}
      />
      </div>
      <div className="h-lvh flex-1">
        {!isLoading && ((selectedConversation?.documents ?? []).length == 0 ?
          <DocumentUpload onUploadComplete={onUploadComplete} /> :
          <div className="flex flex-col h-screen">
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto">
              <div className="py-5 px-10">
                <FundOverview
                  fundName={selectedConversation.fundName}
                  fundOverview={selectedConversation.fundOverview}
                />
              </div>
              <Messages
                messages={messages}
                //messages={[{queryText: "hi", responseText: "These enhancements should provide a more user-friendly and aesthetically pleasing chat interface."}, {queryText: "hi", responseText: "These enhancements should provide a more user-friendly and aesthetically pleasing chat interface."}]}
                isResponding={isResponding}
              />
            </div>
            <MessageInput
              onMessageSubmit={handleWebsocketMessageSubmit}
              isResponding={isResponding}
              errorMessage={errorMessage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
