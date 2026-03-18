# 🤖 SecureAudit + Ollama (LLaMA) Integration Guide

## 📌 Objective

Integrate **Ollama (LLaMA model)** into the SecureAudit system to enable:

* Intelligent chatbot fallback
* Answer rephrasing (audit-grade tone)
* Question normalization
* AI-assisted responses when KB fails

This ensures a **hybrid system**:

* Deterministic (KB + similarity)
* Intelligent (LLM fallback)

---

## 🧠 Final Architecture

```text
User Query
   ↓
[Optional] Normalize Question (Ollama)
   ↓
Similarity Engine (TF-IDF)
   ↓
IF confidence ≥ threshold:
    → Knowledge Base Answer
    → [Optional] Rephrase via Ollama
ELSE:
    → Ollama generates response
```

---

## ⚙️ System Requirements

* Python backend (existing)
* Ollama Desktop installed and running
* Model installed:

```bash
ollama pull llama3
```

Run:

```bash
ollama run llama3
```

---

## 🌐 Ollama API Details

* Base URL:

```
http://localhost:11434
```

* Endpoint:

```
POST /api/generate
```

* No API key required

---

## 🔧 Step 1: Backend Utility Layer

### File: `backend/server.py`

Add:

```python
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3"

def query_ollama(prompt, timeout=60):
    try:
        res = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=timeout
        )

        if res.status_code != 200:
            return None

        data = res.json()
        return data.get("response", "").strip()

    except Exception:
        return None
```

---

## 🧠 Step 2: Prompt Templates (CRITICAL)

Define standardized prompts:

```python
def build_chat_prompt(user_query):
    return f"""
You are a cybersecurity audit assistant.

Guidelines:
- Be precise and professional
- Use audit/compliance language
- Avoid speculation
- Keep answers concise

User Question:
{user_query}
"""

def build_rephrase_prompt(answer):
    return f"""
Rewrite the following answer in a formal cybersecurity audit tone:

{answer}
"""

def build_normalize_prompt(question):
    return f"""
Convert this into a standardized cybersecurity audit question:

{question}
"""
```

---

## 🔍 Step 3: Question Normalization Layer

```python
def normalize_question(question):
    normalized = query_ollama(build_normalize_prompt(question))
    return normalized if normalized else question
```

Use BEFORE similarity matching.

---

## 🤖 Step 4: Chatbot Decision Engine

Replace existing chatbot logic:

```python
def get_chatbot_response(user_query, kb_answer, confidence):
    
    THRESHOLD = 0.8

    # Step 1: Normalize question
    normalized_query = normalize_question(user_query)

    # Step 2: Use KB if confident
    if confidence >= THRESHOLD and kb_answer:
        return rephrase_answer(kb_answer)

    # Step 3: Fallback to Ollama
    prompt = build_chat_prompt(normalized_query)
    response = query_ollama(prompt)

    if response:
        return response

    # Step 4: Final fallback
    return "No answer found. Manual review required."
```

---

## ✍️ Step 5: Rephrasing Layer

```python
def rephrase_answer(answer):
    improved = query_ollama(build_rephrase_prompt(answer))
    return improved if improved else answer
```

---

## 🌐 Step 6: API Endpoint (Optional)

```python
from flask import request, jsonify

@app.route("/api/ollama", methods=["POST"])
def ollama_api():
    data = request.json
    prompt = data.get("prompt", "")

    response = query_ollama(prompt)

    return jsonify({
        "response": response or "Error processing request"
    })
```

---

## 💻 Step 7: Frontend Integration

### File: `frontend/app.js`

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

## ⚠️ Usage Policy (MANDATORY)

### DO NOT:

* Call Ollama for every request
* Replace KB logic entirely

### ONLY USE Ollama:

* When confidence < threshold
* For rephrasing
* For normalization
* For fallback generation

---

## 🛠 Error Handling Strategy

| Scenario           | Action                          |
| ------------------ | ------------------------------- |
| Ollama not running | Return "AI service unavailable" |
| API timeout        | Fallback to KB/manual           |
| Empty response     | Retry once → fallback           |

---

## 🚀 Performance Optimization

* Cache Ollama responses (optional)
* Use smaller model if latency high:

  ```
  mistral / phi
  ```
* Avoid multiple LLM calls per request

---

## 📈 Future Enhancements

* Multi-turn chat (`/api/chat`)
* KB auto-generation using AI
* Audit report summarization
* Risk classification (IAM, VAPT, etc.)
* Confidence explanation layer

---

## ✅ Expected Outcome

After implementation:

* Fast KB responses (existing)
* AI-enhanced fallback responses
* Improved answer quality
* Fully local AI system (no external APIs)

---

## 🧠 System Evolution

```text
Before:
Rule-based KB System

After:
Hybrid AI Audit Assistant (KB + LLM)
```

---

## 📌 End of File
