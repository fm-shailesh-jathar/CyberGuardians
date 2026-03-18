Make one more tab in AI engine named as Audit Upload

Page Functionality Definition (Codex Prompt)
🧠 Core Purpose

This page is an AI-powered Security Questionnaire Automation Dashboard that allows users to:

Upload audit questionnaires (CSV, XLSX, DOCX)

Auto-match questions with a knowledge base

Generate suggested answers with confidence scores

Review, edit, and export completed audits

This follows the typical workflow of AI questionnaire automation tools where:

Upload → Parse → Match → Suggest Answers → Review → Export

🧩 1. Header Section
Features:

Title: Security Questionnaire Automation Dashboard

Subtitle:
Upload questionnaire · match to knowledge base · confidence scoring

Actions:

Download CSV Template

Downloads a predefined questionnaire format

Upload & Process

Triggers parsing + AI processing pipeline

📂 2. Upload Section
UI:

File picker (Choose file)

Supported formats:

CSV

XLSX

DOCX

(PDF planned)

Logic:

Accept file input

Validate structure:

If column Question exists → use it

Else → fallback to first column

Tip behavior:

Show helper text:
"Include a 'Question' column. If missing, first column will be used."

📁 3. Recent Uploads Panel
Features:

Display list of uploaded files

Show:

File name

Upload timestamp

Status (Processed / Pending)

Actions:

Clear all → removes history

📊 4. Results Section
Controls:

Auto-fill threshold:

Default: 0.70 (70%)

Logic:

>= threshold → Auto

< threshold → Manual

Filters:

All

Auto

Manual

📋 5. Results Table
Columns:
Column	Description
Question	Extracted question
Suggested Answer	AI-generated answer
Confidence	Match score (0–1 or %)
Source Question	Matched KB question
Status	Auto / Manual
⚙️ Processing Logic
Step 1: Parse File

Extract rows

Identify question column

Step 2: Knowledge Base Matching

Compare each question with KB using:

Semantic similarity (embeddings)

Keyword matching

Step 3: Answer Generation

If match found:

Fetch answer from KB

Else:

Generate via LLM (fallback)

Step 4: Confidence Scoring

Assign score:

High → strong semantic match

Medium → partial match

Low → weak or generated

👉 Confidence scoring is critical in such systems to indicate reliability and flag uncertain answers

🏷️ Status Assignment
if confidence >= threshold:
    status = "Auto"
else:
    status = "Manual"
✏️ 6. User Actions
Fill Answers

Auto-populates all rows with suggested answers

Export Filled File

Outputs file in same format:

CSV / XLSX

Keeps original structure intact

🔄 7. Empty State

Show message:
No audit selected.

🧠 8. AI + Knowledge Base Behavior

Uses:

Internal KB (policies, past audits)

Previous questionnaire answers

Behavior:

Reuse past answers

Avoid hallucination

Flag uncertain responses for manual review

This aligns with modern tools where:

AI suggests answers

Low-confidence items require human validation

🚀 9. Optional Enhancements (Recommended)

Inline editing of answers

Confidence color coding:

Green → High

Yellow → Medium

Red → Low

Source preview tooltip

Bulk approve/reject

Progress indicator (% completed)