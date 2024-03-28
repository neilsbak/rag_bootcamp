import streamlit as st
from getpass import getpass
import os
from pathlib import Path

from llama_index.core import ServiceContext, SimpleDirectoryReader, VectorStoreIndex
from llama_index.embeddings.cohere import CohereEmbedding
from llama_index.llms.cohere import Cohere
from llama_index.postprocessor.cohere_rerank import CohereRerank
from llama_index.core.memory import ChatMemoryBuffer

st.set_page_config(page_title="TD Team B", page_icon="🦙", layout="centered", initial_sidebar_state="auto", menu_items=None)
st.title("Chat with Fund data, powered by LlamaIndex 💬🦙")
         
if "messages" not in st.session_state.keys(): # Initialize the chat messages history
    st.session_state.messages = [
        {"role": "assistant", "content": "Ask me about this fund!"}
    ]

@st.cache_resource(show_spinner=False)
def load_data():
    with st.spinner(text="Loading and indexing the Streamlit docs – hang tight! This should take 1-2 minutes."):

        try:
            os.environ["COHERE_API_KEY"] = open(Path.home() / ".cohere.key", "r").read().strip()
            os.environ["CO_API_KEY"] = open(Path.home() / ".cohere.key", "r").read().strip()
        except Exception:
            print(f"ERROR: You must have a Cohere API key available in your home directory at ~/.cohere.key")

        llm = Cohere(api_key=os.environ["COHERE_API_KEY"])

        # Load the pdfs
        pdf_folder_path = "./source_documents"
        documents = documents = SimpleDirectoryReader(input_files=[f"{pdf_folder_path}/Vanguard_ETF_Statutory_Prospectus_Single_VOE.pdf"]).load_data()

        embed_model = CohereEmbedding(
            model_name="embed-english-v3.0",
            input_type="search_query"
        )
        service_context = ServiceContext.from_defaults(
            embed_model=embed_model,
            llm=llm,
            chunk_size=200
        )

        index = VectorStoreIndex.from_documents(documents, service_context=service_context, show_progress=True)
        reranker = CohereRerank()
        
        query_engine = index.as_query_engine(
            node_postprocessors = [reranker]
        )

        fund_name = query_engine.query("What is the name of the fund? Give only the name without additional comments. The name of the fund is: ")
        st.session_state["fund_name"] = fund_name

        queries = [
            "What is the investment strategy of the fund?",
            "What are the investment objectives of the fund?",
            "Who are the key people in the management team?",
            "What is the investment philosphy of the fund regarding ESG (Environmental, Social, and Governance)?",
            "What industries, markets, or types of securities is the fund want exposure to?",
            "What investment tools (derivatives, leverage, etc) does does the fund use to achieve their investment goals?"
        ]

        responses = []

        for query in queries:
            result = query_engine.query(query)
            responses.append(result)

        response_answer_pairs = zip(queries, responses)

        response_answer_text = ""
        for (query, response) in response_answer_pairs:
            response_answer_text = f"{response_answer_text}{query}\n{response}\n\n"

        st.session_state["fund_summary"] = response_answer_text
        return index

index = load_data()

if "fund_summary" in st.session_state.keys():
    st.header(st.session_state["fund_name"])
    st.subheader("Fund Summary")
    st.write(st.session_state["fund_summary"])

if "chat_engine" not in st.session_state.keys(): # Initialize the chat engine
        
        memory = ChatMemoryBuffer.from_defaults(token_limit=1500)
        chat_engine = index.as_chat_engine(
            chat_mode="context",
            memory=memory,
            verbose=True,
            system_prompt=(
                f"You are an expert Mutual Fund analyst for a bank, and you privide answers to your boss about whether the bank should purchase the fund named {st.session_state.get('fund_name')}."
                f"  You have answered these key questions about the fund:\n {st.session_state.get('fund_summary')}"
            ),
        )
        st.session_state.chat_engine = chat_engine
        #st.session_state.chat_engine = index.as_chat_engine(chat_mode="condense_question", verbose=True)

if prompt := st.chat_input("Your question"): # Prompt for user input and save to chat history
    st.session_state.messages.append({"role": "user", "content": prompt})

for message in st.session_state.messages: # Display the prior chat messages
    with st.chat_message(message["role"]):
        st.write(message["content"])

# If last message is not from assistant, generate a new response
if st.session_state.messages[-1]["role"] != "assistant":
    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            response = st.session_state.chat_engine.chat(prompt)
            st.write(response.response)
            message = {"role": "assistant", "content": response.response}
            st.session_state.messages.append(message) # Add response to message history
