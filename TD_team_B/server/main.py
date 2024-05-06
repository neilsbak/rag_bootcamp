from contextlib import asynccontextmanager
import json
import logging
from pathlib import Path
import tempfile
import shutil

import traceback
from typing import List
from fastapi import FastAPI, File, Form, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import llama_index.core
from llama_index.core import Settings, StorageContext, SimpleDirectoryReader, VectorStoreIndex
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core.llms import ChatMessage, MessageRole
import uvicorn
import chromadb
from chat_response import ChatResponse, ResponseType, Sender
from rag_session import RagSession

llama_index.core.set_global_handler("simple")
Settings.chunk_size = 200
Settings.chunk_overlap = 30

queries = [
    "What is the investment strategy of the fund?",
    "What are the investment objectives of the fund?",
    "Who are the key people in the management team?",
    "What is the investment philosphy of the fund regarding ESG (Environmental, Social, and Governance)?",
    "What industries, markets, or types of securities is the fund want exposure to?",
    "What investment tools (derivatives, leverage, etc) does does the fund use to achieve their investment goals?"
]

app = FastAPI()

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload/")
async def create_upload_files(session_id: str = Form(...), settings: str = Form(...), files: List[UploadFile] = File(...)):
    # Create a temporary directory to store uploaded files
    with tempfile.TemporaryDirectory() as temp_dir:
        for file in files:
            temp_file_path = Path(temp_dir) / file.filename
            # Save uploaded file to temporary directory
            with temp_file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        
        documents = SimpleDirectoryReader(input_dir=temp_dir).load_data()

    rag_session = RagSession(json.loads(settings))

    db = chromadb.PersistentClient(path="./chroma_db")
    chroma_collection = db.get_or_create_collection(session_id)
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    index = VectorStoreIndex.from_documents(documents, storage_context=storage_context, embed_model=rag_session.embed_model)
    query_engine = index.as_query_engine(
        llm=rag_session.llm_model
        #node_postprocessors = [reranker]
    )
    fund_name_response = query_engine.query("What is the name of the fund? Give only the name without additional comments. The name of the fund is: ")
    fund_name = fund_name_response.response
    responses = []
    for query in queries:
        result = query_engine.query(query)
        responses.append(result)

    response_answer_pairs = [{"query": query, "response": response.response} for query,response in zip (queries, responses)]

    return {
        "fund_name": fund_name,
        "fund_overview": response_answer_pairs
    }

@app.websocket("/ws_chat")
async def websocket_query(websocket: WebSocket):
    await websocket.accept()
    chat_history = []
    fund_name = ""
    try:
        # TODO: set up authentication
        is_authenticated = False
        while True:
            if not is_authenticated:
                chat_info = await websocket.receive_json()
                fund_name = chat_info["fund_name"]
                # TODO: setup rag index and authenticate
                is_authenticated = True            
                chat_history = [
                    item
                    for pair in (chat_info.get("history") or [])
                    for item in [
                        ChatMessage(role=MessageRole.USER, content=pair[0]),
                        ChatMessage(role=MessageRole.ASSISTANT, content=pair[1])
                    ]
                ]
            else:
                query_info = await websocket.receive_json()

                query = query_info["query"]
                await websocket.send_text(ChatResponse(sender=Sender.BOT, type=ResponseType.START).model_dump_json())
                await websocket.send_text(ChatResponse(sender=Sender.YOU, message=query, type=ResponseType.STREAM).model_dump_json())

                session_id = query_info["session_id"]
                print(f"session_id: {session_id}")
                rag_session = RagSession(query_info["settings"])

                db2 = chromadb.PersistentClient(path="./chroma_db")
                chroma_collection = db2.get_collection(session_id)
                vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
                index = VectorStoreIndex.from_vector_store(
                    vector_store,
                    embed_model=rag_session.embed_model,
                )
                memory = ChatMemoryBuffer.from_defaults(token_limit=1500)
                print(chat_history)
                chat_engine = index.as_chat_engine(
                    llm=rag_session.llm_model,
                    chat_mode="context",
                    memory=memory,
                    system_prompt=
                        f"You are an expert Mutual Fund analyst for a bank, and you privide answers to your boss about whether the bank should purchase the fund named {fund_name}. Only base your answer on the context information. If the information is not provided, just say you don't know.",
                )
                message = f"{query}\nIf the context does not contain the information to answer this question, then do not attempt to answer, and just say you don't know."
                if rag_session.use_async_chat:
                    response = await chat_engine.astream_chat(message=message, chat_history=chat_history)
                    async for response_chunk in response.async_response_gen(): # Assuming this is iterable
                        await websocket.send_text(ChatResponse(sender=Sender.BOT, message=response_chunk, type=ResponseType.STREAM).model_dump_json())
                else:
                    response = chat_engine.stream_chat(message=message, chat_history=chat_history)
                    for response_chunk in response.response_gen:
                        await websocket.send_text(ChatResponse(sender=Sender.BOT, message=response_chunk, type=ResponseType.STREAM).model_dump_json())
                await websocket.send_text(ChatResponse(sender=Sender.BOT, type=ResponseType.END).model_dump_json())
                chat_history = chat_engine.chat_history
    except WebSocketDisconnect:
       logging.info("websocket disconnect")
    except Exception as e:
        traceback.print_exc()
        print(f"Error: {str(e)}")
        resp = ChatResponse(
            sender=Sender.BOT,
            message="Sorry, something went wrong. Try again.",
            type=ResponseType.ERROR,
        )
        await websocket.send_text(resp.model_dump_json())


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)