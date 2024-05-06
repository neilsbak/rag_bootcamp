from llama_index.llms.ollama import Ollama
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.llms.cohere import Cohere
from llama_index.embeddings.cohere import CohereEmbedding

class RagSession:

    @staticmethod
    def _ollama_llm_model(params):
        return Ollama(model=params["llmModel"], request_timeout=30.0, temperature=0)
        
    @staticmethod
    def _cohere_llm_model(params):
        return Cohere(model=params["llmModel"], api_key=params["apiKey"])

    _llm_model_dict = {
        "ollama": _ollama_llm_model,
        "cohere": _cohere_llm_model
    }

    @staticmethod
    def _ollama_embedding_model(params):
        return OllamaEmbedding(
            model_name=params["embeddingModel"],
            ollama_additional_kwargs={"mirostat": 0},
        )

    @staticmethod
    def _cohere_embedding_model(params):
        return CohereEmbedding(
            model_name=params["embeddingModel"],
            cohere_api_key=params["apiKey"]
        )

    _embedding_model_dict = {
        "ollama": _ollama_embedding_model,
        "cohere": _cohere_embedding_model
    }

    def __init__(self, settings: dict):
        llm_name: str = str(settings["llm"])
        llm_params: dict = settings["models"][llm_name]
        embedding_name: str = str(settings["embedding"])
        embedding_params: dict = settings["models"][embedding_name]

        self.llm_name: str = llm_name
        self.llm_params = llm_params
        self.embedding_name: str = embedding_name
        self.embedding_params = embedding_params
        self.llm_model = RagSession._llm_model_dict[llm_name](llm_params)
        self.embed_model = RagSession._embedding_model_dict[embedding_name](embedding_params)
        self.use_async_chat = (llm_name != "cohere")
