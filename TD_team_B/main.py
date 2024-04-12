from contextlib import asynccontextmanager
from pathlib import Path
import tempfile
import shutil

from typing import List
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import StreamingResponse
from llama_index.core import ServiceContext, SimpleDirectoryReader, VectorStoreIndex
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.core.memory import ChatMemoryBuffer
import uvicorn

queries = [
    "What is the investment strategy of the fund?",
    "What are the investment objectives of the fund?",
    "Who are the key people in the management team?",
    "What is the investment philosphy of the fund regarding ESG (Environmental, Social, and Governance)?",
    "What industries, markets, or types of securities is the fund want exposure to?",
    "What investment tools (derivatives, leverage, etc) does does the fund use to achieve their investment goals?"
]

rag_model = {    
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    llm = Ollama(model="llama2", request_timeout=30.0)

    rag_model["embed_model"] = OllamaEmbedding(
        model_name="nomic-embed-text",
        base_url="http://localhost:11434",
        ollama_additional_kwargs={"mirostat": 0},
    )

    rag_model["service_context"] = ServiceContext.from_defaults(
        embed_model=rag_model["embed_model"],
        llm=llm,
        chunk_size=200
    )
    yield    

app = FastAPI(lifespan=lifespan)

@app.post("/upload/")
async def create_upload_files(files: List[UploadFile] = File(...)):
    # Create a temporary directory to store uploaded files
    with tempfile.TemporaryDirectory() as temp_dir:
        for file in files:
            temp_file_path = Path(temp_dir) / file.filename
            # Save uploaded file to temporary directory
            with temp_file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        
        documents = SimpleDirectoryReader(input_dir=temp_dir).load_data()
    index = VectorStoreIndex.from_documents(documents, service_context=rag_model["service_context"])
    query_engine = index.as_query_engine(
        #node_postprocessors = [reranker]
    )
    fund_name = query_engine.query("What is the name of the fund? Give only the name without additional comments. The name of the fund is: ")
    responses = []
    for query in queries:
        result = query_engine.query(query)
        responses.append(result)

    response_answer_pairs = [{"query": query, "response": response.response} for query,response in zip (queries, responses)]

    memory = ChatMemoryBuffer.from_defaults(token_limit=1500)
    rag_model["chat_engine"] = index.as_chat_engine(
        chat_mode="context",
        memory=memory,
        system_prompt=(
            f"You are an expert Mutual Fund analyst for a bank, and you privide answers to your boss about whether the bank should purchase the fund named {fund_name}."
        ),
    )
    
    return {"fund_overview": response_answer_pairs}

@app.get("/chat/")
async def root(question: str) -> StreamingResponse:
    response = rag_model["chat_engine"].stream_chat(question)
    return StreamingResponse(response.response_gen, media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)