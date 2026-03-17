# 🚀 Ollama Integration Guide (SecureAudit Project)

## 📌 Overview

This document provides step-by-step instructions to integrate **local LLM capabilities using Ollama** into the existing SecureAudit system.

The goal is to enhance:

* Chatbot responses
* Answer rephrasing
* Question normalization
* AI fallback when KB fails

---

## 🧠 Architecture After Integration

```
User Input
   ↓
Similarity Engine (existing)
   ↓
IF confidence ≥ threshold → Knowledge Base Answer
ELSE → Ollama (LLM fallback)
```

---

## ⚠️ Important Notes

* Ollama runs **locally** (no API key required)
* API base URL:

```
http://localhost:11434/api
```

* Main endpoint used:

```
POST /api/generate
```

Ollama exposes REST endpoints for generating responses using local models ([ollama.qubitpi.org][1])

---

## 🧩 Step 1: Ensure Ollama is Running

Run in terminal:

```
ollama run llama3
```

Verify:

```
http://localhost:11434
```

Expected:

```
Ollama is running
```

---

## ⚙️ Step 2: Backend Integration (Python)

### Add Ollama Utility Function

In `backend/server.py`:

```python
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3"

def query_ollama(prompt):
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=60
        )

        if response.status_code == 200:
            return response.json().get("response", "").strip()
        else:
            return "Error: Ollama API failed"

    except Exception as e:
        return f"Error: {str(e)}"
```

---

## 🤖 Step 3: Integrate with Chatbot Logic

Update chatbot response flow:

```python
def get_chatbot_response(user_query, kb_answer, confidence):

    # Use KB if confidence is high
    if confidence >= 0.8:
        return kb_answer

    # Fallback to Ollama
    prompt = f"""
You are a cybersecurity audit assistant.

User Question:
{user_query}

No KB answer found.

Provide a professional and accurate response.
"""

    return query_ollama(prompt)
```

---

## ✍️ Step 4: Add Answer Rephrasing

```python
def rephrase_answer(answer):
    prompt = f"""
Rewrite this answer in a formal cybersecurity audit tone:

{answer}
"""
    return query_ollama(prompt)
```

Use this before sending responses to UI.

---

## 🔍 Step 5: Question Normalization (Improves Matching)

```python
def normalize_question(question):
    prompt = f"""
Convert this into a clean and standard cybersecurity audit question:

{question}
"""
    return query_ollama(prompt)
```

Use before similarity matching:

```python
normalized_q = normalize_question(user_query)
```

---

## 🌐 Step 6: Create API Endpoint (Optional)

```python
from flask import request, jsonify

@app.route("/api/ollama", methods=["POST"])
def ollama_api():
    data = request.json
    prompt = data.get("prompt", "")
    
    response = query_ollama(prompt)
    
    return jsonify({"response": response})
```

---

## 💻 Step 7: Frontend Integration

In `frontend/app.js`:

```javascript
async function callOllama(prompt) {
  const res = await fetch("/api/ollama", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt })
  });

  const data = await res.json();
  return data.response;
}
```

---

## ⚠️ Usage Rules (Critical)

DO NOT:

* Call Ollama for every request

ONLY use Ollama when:

* Confidence < threshold
* Rephrasing is required
* Enhancement is needed

---

## 🛠 Error Handling

Handle the following cases:

| Scenario           | Action                         |
| ------------------ | ------------------------------ |
| Ollama not running | Show: "AI service unavailable" |
| Timeout            | Fallback to KB/manual          |
| API error          | Log + return safe message      |

---

## 🚀 Future Enhancements

* AI-based KB auto-suggestions
* Audit report generation
* Category classification (IAM / VAPT / etc.)
* Answer improvement engine
* Multi-turn chat using `/api/chat`

---

## ✅ Expected Outcome

After implementation:

* Fast KB-based responses
* Intelligent fallback using Ollama
* Improved answer quality and formatting
* Fully local AI system (no external APIs)

---

## 🧠 Summary

This integration upgrades the system from:

```
Static KB System → AI-Assisted Audit System
```

---

## 📌 End of Instructions

[1]: https://ollama.qubitpi.org/api/?utm_source=chatgpt.com "API Reference - Ollama Documentation"
