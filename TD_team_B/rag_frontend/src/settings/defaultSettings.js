export default {
    llm: 'ollama',
    embedding: 'ollama',
    models: {
      ollama: {
        baseUrl: "http://localhost:11434",
        llmModel: "llama3",
        embeddingModel: "nomic-embed-text"
      },
      cohere: {
        llmModel: "command",
        embeddingModel: "embed-english-v3.0"
      }
    },
  };