import os
import json
from typing import Any, Dict, Optional
import re
import requests
from dotenv import load_dotenv

# -------------------------------------------------
# ENV + GEMINI CONFIG
# -------------------------------------------------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set.")

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)

# -------------------------------------------------
# CALL GEMINI
# -------------------------------------------------
def call_gemini(prompt: str) -> Optional[str]:
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0}   # FORCE STRICT JSON
    }

    resp = requests.post(GEMINI_ENDPOINT, json=payload)
    resp.raise_for_status()
    data = resp.json()

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except:
        return None

# -------------------------------------------------
# BUILD STRICT JSON PROMPT
# -------------------------------------------------
def compute_basic_stats(result: Dict[str, Any]) -> Dict[str, Any]:
    score = result.get("score", 0)
    total = result.get("total_questions", 0)

    accuracy = (score / total) if total else 0
    per_type = {}

    for key in ["mcq", "multiple_correct", "fill_in_the_blanks", "true_false"]:
        section = result.get(key, {})
        if isinstance(section, dict) and section:
            correct = sum(1 for q, d in section.items() if d.get("is_correct"))
            per_type[key] = correct / len(section)

    return {
        "score": score,
        "total": total,
        "accuracy": accuracy,
        "by_type": per_type,
    }

def build_feedback_prompt(result: Dict[str, Any]) -> str:
    stats = compute_basic_stats(result)
    result_json_str = json.dumps(result, indent=2)

    return f"""
You are an educational evaluation AI.
You MUST return ONLY a valid JSON object. No markdown. No headings. No lists.

STUDENT RESULT:
{result_json_str}

STATS:
{stats}

OUTPUT FORMAT (STRICT):

{{
  "overall_performance": "text only",
  "strengths": "text only",
  "areas_for_improvement": "text only",
  "question_type_breakdown": "text only",
  "next_steps": "text only"
}}

RULES:
- Output MUST start with '{{' and end with '}}'.
- No markdown (#, *, **).
- No explanations outside the JSON.
- Each key must contain ONE plain paragraph.

Return ONLY the JSON. Nothing else.
"""

# -------------------------------------------------
# MAIN ENTRYPOINT
# -------------------------------------------------
def generate_feedback_from_result(result: Dict[str, Any]) -> str:
    prompt = build_feedback_prompt(result)
    return call_gemini(prompt) or "{}"

# -------------------------------------------------
# STRICT JSON NORMALIZER
# -------------------------------------------------
def normalize_to_feedback_json(text: str) -> dict:
    # Remove code blocks
    cleaned = re.sub(r"```[\s\S]*?```", "", text).strip()

    # Extract first {...} JSON object
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if not match:
        return {}

    cleaned = match.group(0)

    # Parse JSON
    try:
        parsed = json.loads(cleaned)
    except:
        return {}

    # Ensure required keys
    template = {
        "overall_performance": "",
        "strengths": "",
        "areas_for_improvement": "",
        "question_type_breakdown": "",
        "next_steps": ""
    }

    template.update(parsed)
    return template
