#!/usr/bin/env python3

from getpass import getpass
import os
from pathlib import Path

from langchain.document_loaders.pdf import PyPDFDirectoryLoader
from langchain.chains import RetrievalQA
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import CohereRerank
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceBgeEmbeddings
from langchain_community.llms import Cohere
from langchain_community.vectorstores import FAISS

def pretty_print_docs(docs):
    print(
        f"\n{'-' * 100}\n".join(
            [f"Document {i+1}:\n\n" + d.page_content for i, d in enumerate(docs)]
        )
    )


def main():

    # Setup the environment
    os.environ["COHERE_API_KEY"] = open(Path.home() / ".cohere.key", "r").read().strip()

    # Look for the source-materials folder and make sure there is at least 1 pdf file here
    contains_pdf = False
    directory_path = "./source-materials"
    if not os.path.exists(directory_path):
        print(f"ERROR: The {directory_path} subfolder must exist under this notebook")
    for filename in os.listdir(directory_path):
        contains_pdf = True if ".pdf" in filename else contains_pdf
    if not contains_pdf:
        print(f"ERROR: The {directory_path} subfolder must contain at least one .pdf file")

    # Start with making a generation request without RAG augmentation
    query = "What is Vector Institute doing to address AI safety and trustworthiness?"
    llm = Cohere()
    print(f"*** Sending non-RAG augmented generation request for query: {query}\n")
    result = llm(query)
    print(f"Result: {result}\n")

    # Load the pdfs
    pdf_folder_path = "./source-materials"
    loader = PyPDFDirectoryLoader(pdf_folder_path)
    docs = loader.load()
    print(f"*** Number of source materials: {len(docs)}")

    # Split the document into smaller chunks
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
    texts = text_splitter.split_documents(docs)
    print(f"*** Number of text chunks: {len(texts)}")
    #print(f"Contents of first text chunk: {texts[0]}")

    # Define Embeddings Model
    model_name = "BAAI/bge-small-en-v1.5"
    encode_kwargs = {'normalize_embeddings': True} # set True to compute cosine similarity

    print(f"*** Setting up the embeddings model...")
    embeddings = HuggingFaceBgeEmbeddings(
        model_name=model_name,
        model_kwargs={'device': 'cuda'},
        encode_kwargs=encode_kwargs
    )

    # Set up the base vector store retriever
    print(f"*** Setting up the base vector store retriever")
    vectorstore = FAISS.from_documents(texts, embeddings)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 20})

    # Retrieve the most relevant context from the vector store based on the query(No Reranking Applied)
    docs = retriever.get_relevant_documents(query)
    #pretty_print_docs(docs)

    # The Generation part of RAG Pipeline
    print(f"*** Now do the RAG generation with query: {query}")
    qa = RetrievalQA.from_chain_type(llm=llm,
            chain_type="stuff",
            retriever=retriever)
    print(f"*** Running generation: {qa.run(query=query)}")

    # Applying Reranking with CohereRerank
    # TODO: Why are we reranking after running the RAG query? Shouldn't we be doing it before?
    print(f"*** Applying re-ranking with CohereRerank")
    compressor = CohereRerank()
    compression_retriever = ContextualCompressionRetriever(
        base_compressor=compressor, base_retriever=retriever
    )
    compressed_docs = compression_retriever.get_relevant_documents(query)
    pretty_print_docs(compressed_docs)

    # Generation — RAG Pipeline using compressor retriever
    qa = RetrievalQA.from_chain_type(llm=llm,
            chain_type="stuff",
            retriever=compression_retriever)
    
    print(qa.run(query=query))


if __name__ == "__main__":
    main()
