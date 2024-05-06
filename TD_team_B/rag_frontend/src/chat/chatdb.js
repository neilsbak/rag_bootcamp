const dbName = "fundChatDB";
const dbVersion = 1;
let _db;
openDB();

export async function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) {
      resolve(_db);
      return;
    }
    const request = window.indexedDB.open(dbName, dbVersion);

    request.onerror = (event) => {
      console.error("Failed to open indexedDB:", event);
      reject(event);
    };

    request.onsuccess = (event) => {
      _db = event.target.result;
      console.log("Opened indexedDB:", _db);
      resolve(_db);
    };

    request.onupgradeneeded = (event) => {
      console.log("Upgrading indexedDB...");
      const db = event.target.result;
      const conversationsStore = db.createObjectStore("conversations", {
        keyPath: "id",
        autoIncrement: true,
      });
      conversationsStore.createIndex("timestamp", "timestamp", {
        unique: false,
      });
      console.log("Upgraded indexedDB.");
    };
  });
}

export async function addConversation(conversation) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["conversations"], "readwrite");
    const store = transaction.objectStore("conversations");
    const request = store.put(conversation);

    request.onsuccess = (event) => {
      conversation.id = event.target.result;
      resolve(conversation);
    };

    request.onerror = (event) => {
      console.error("Failed to add conversation:", event);
      reject(event);
    };
  });
}

export async function getConversations() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["conversations"], "readonly");
    const store = transaction.objectStore("conversations");
    const request = store.getAll();

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("Failed to retrieve conversations:", event);
      reject(event);
    };
  });
}

export async function addMessage(conversation, message) {
  const timestamp = new Date().getTime();
  const newMessage = { timestamp, ...message };

  const updatedConversation = {
    ...conversation,
    messages: [...conversation.messages, newMessage],
  };
  return await addConversation(updatedConversation);
}

export async function deleteConversation(conversationId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["conversations"], "readwrite");
    const store = transaction.objectStore("conversations");
    const request = store.delete(conversationId);

    request.onsuccess = (event) => {
      console.log("Deleted conversation with ID:", conversationId);
      getConversations()
        .then((conversations) => {
          resolve(conversations);
        })
        .catch((error) => {
          console.error(
            "Failed to get conversations after deleting conversation with ID:",
            conversationId,
            error
          );
          reject(error);
        });
    };

    request.onerror = (event) => {
      console.error(
        "Failed to delete conversation with ID:",
        conversationId,
        event
      );
      reject(event);
    };
  });
}
