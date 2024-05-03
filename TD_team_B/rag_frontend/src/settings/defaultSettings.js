export default {
    llm: 'ollama',
    embedding: 'ollama',
    llms: {
      ollama: {
        baseUrl: "http://localhost:11434",
        modelName: "llama3"
      }
    },
    embeddings: {
      ollama: {
        baseUrl: "http://localhost:11434",
        modelName: "nomic-embed-text"
      }
    }
  };