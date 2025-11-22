import os
import json
from flask import Flask, request, jsonify
import tempfile
from flask_cors import CORS
from feedback import generate_feedback_from_result, normalize_to_feedback_json

import numpy as np
from dotenv import load_dotenv
from pptx import Presentation
import docx2txt
import PyPDF2
from langchain_text_splitters import RecursiveCharacterTextSplitter
import requests

from rag import extract_text, build_index, retrieve_top_k, call_gemini

# ------------------------------------
# Flask App + Env
# ------------------------------------
app = Flask(__name__)
CORS(app)
load_dotenv()


@app.route("/generate_mcq", methods=["POST"])
def generate_mcq():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    # inputs from frontend
    num_questions = int(request.form.get("num_questions", 10))
    user_focus = request.form.get("user_focus", "").strip()

    uploaded = request.files["file"]
    ext = uploaded.filename.split(".")[-1].lower()

    # save temp file
    tmp_path = f"temp_uploaded.{ext}"
    uploaded.save(tmp_path)

    # 1️⃣ extract text
    text = extract_text(tmp_path, ext)
    if not text:
        return jsonify({"error": "Could not extract text"}), 500

    # 2️⃣ chunking
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500,
        chunk_overlap=200
    )
    chunks = splitter.split_text(text)

    # 3️⃣ build embeddings + index
    indexed_chunks, embeddings = build_index(chunks)

    # 4️⃣ retrieval query generation
    if user_focus:
        query = (
            f"Key concepts related to: {user_focus}. "
            f"Use this context to generate {num_questions} meaningful MCQs."
        )
    else:
        query = (
            f"Key concepts that are most important in the uploaded document "
            f"for generating {num_questions} simple, meaningful MCQs."
        )

    # 5️⃣ retrieve top chunks
    retrieved_chunks = retrieve_top_k(
        query, indexed_chunks, embeddings, k=5
    )

    if not retrieved_chunks:
        return jsonify({"error": "RAG retrieval failed"}), 500

    context_text = "\n\n".join(retrieved_chunks)

    # 6️⃣ FULL PROMPT ENGINEERING
    prompt = f"""
You are an expert educational AI system. Your task is to generate multiple-choice questions (MCQs)
based ONLY on the retrieved context below.

### Retrieved Context:
{context_text}

### Instructions:
- Generate **{num_questions}** simple, meaningful MCQs that test understanding.
- Each question must have exactly 4 options and ONE correct answer.
- Assign difficulty level:
  - "Easy": recall
  - "Medium": understanding
  - "Hard": reasoning
- Use only information inside the retrieved context.
- STRICTLY return JSON in this format:

{{
  "Question text 1": {{
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option": "Correct Option Text",
    "difficulty": "Easy | Medium | Hard"
  }},
  "Question text 2": {{
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option": "Correct Option Text",
    "difficulty": "Easy | Medium | Hard"
  }}
}}
"""

    # 7️⃣ LLM call
    raw_output = call_gemini(prompt)

    cleaned = raw_output.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    try:
        mcqs = json.loads(cleaned)
    except:
        return jsonify({"error": "LLM returned invalid JSON", "raw": raw_output}), 500
    print(mcqs)
    return jsonify({"mcqs": mcqs})

@app.route("/generate_feedback", methods=["POST"])
def generate_feedback_route():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No result JSON received"}), 400

        # Raw Gemini text (not guaranteed to be JSON)
        feedback_raw = generate_feedback_from_result(data)
        print("\n================ RAW GEMINI FEEDBACK ================")
        print(feedback_raw)
        print("=====================================================\n")


        # Convert messy LLM text → valid JSON with 5 sections
        feedback_json = normalize_to_feedback_json(feedback_raw)

        return jsonify({
            "feedback": feedback_json
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------
# RUN SERVER
# ---------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True)
