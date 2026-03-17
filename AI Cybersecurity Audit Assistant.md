# **AI Cybersecurity Audit Assistant**

Complete Engineering Specification

Author: Cyber Gurdian  
Version: 1.0  
Purpose: Automated Cybersecurity Audit Response System

---

# **1\. Product Overview**

The AI Cybersecurity Audit Assistant is a web platform designed to automate responses to cybersecurity audit questionnaires.

Organizations frequently receive audit questionnaires from banks and partners and must respond manually. This system reduces manual work by automatically suggesting answers using an internal knowledge base.

The system must support questions related to security frameworks such as PCI DSS.

Example auditors include financial institutions like HDFC Bank, ICICI Bank, and IDFC FIRST Bank.

---

# **2\. Core Functional Requirements**

## **2.1 Knowledge Base**

The system stores cybersecurity questions and answers.

Features:

• Add new question and answer  
• Edit existing answers  
• Delete outdated entries  
• Import knowledge base from JSON or Excel

Example record:

Question  
Is multi-factor authentication enabled?

Answer  
Yes. Multi-factor authentication is required for privileged accounts.

Category  
Access Control

---

## **2.2 Semantic Similarity Matching**

Questions asked during audits may have different wording but identical meaning.

Example:

Do you enforce MFA for administrators?

Is multi-factor authentication enabled for privileged users?

Both should map to the same knowledge base entry.

The system must implement semantic search using vector embeddings.

---

## **2.3 Knowledge-Base-Only Answer Policy**

The system must never generate answers independently.

If no answer exists:

Return message:

"No answer found in knowledge base. Manual response required."

AI suggestions may be shown separately but must never be automatically saved.

---

## **2.4 Audit Questionnaire Upload**

Users must be able to upload audit questionnaires.

Supported formats:

Excel (.xlsx)  
CSV  
Word (.docx)  
PDF (future phase)

The system extracts questions and automatically searches the knowledge base.

Output should display:

Question  
Suggested Answer  
Confidence Score  
Source Question  
Status (Auto / Manual)

---

## **2.5 Chatbot Assistant**

The application must include a chatbot that answers questions using the knowledge base.

Chatbot rules:

• Retrieve answers using semantic search  
• Do not hallucinate answers  
• Display similarity confidence  
• Show source knowledge base question

Example:

User  
Do you monitor firewall logs?

Bot  
Yes. Firewall logs are monitored and integrated into SIEM.

Matched Knowledge Base Question  
Are firewall logs monitored?

Confidence  
0.89

---

# **3\. System Architecture**

Frontend  
React \+ TailwindCSS

Backend  
Spring Boot (Java 17\)

Database  
PostgreSQL

Vector Search  
pgvector extension

AI Embeddings  
OpenAI embeddings or Sentence Transformers

File Processing  
Apache POI

Deployment  
Docker containers

---

# **4\. High Level Architecture**

User  
↓  
React Web Application  
↓  
Spring Boot REST API  
↓  
Embedding Generator  
↓  
Vector Search (pgvector)  
↓  
Knowledge Base  
↓  
Response Returned

---

# **5\. Project Directory Structure**

project-root

backend  
src/main/java/com/auditassistant  
controller  
service  
repository  
model  
config

frontend  
src  
components  
pages  
services

database  
schema.sql

knowledge-base  
knowledge\_base.json

docker  
docker-compose.yml

docs  
architecture.md

---

# **6\. Database Design**

Enable pgvector extension

CREATE EXTENSION vector;

---

## **Knowledge Base Table**

CREATE TABLE knowledge\_base (  
id SERIAL PRIMARY KEY,  
question TEXT NOT NULL,  
answer TEXT NOT NULL,  
category TEXT,  
embedding VECTOR(1536),  
created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP  
);

---

## **Audit Questions Table**

CREATE TABLE audit\_questions (  
id SERIAL PRIMARY KEY,  
question TEXT,  
suggested\_answer TEXT,  
matched\_kb\_id INT,  
similarity\_score FLOAT,  
status VARCHAR(20),  
created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP  
);

---

## **Chat History Table**

CREATE TABLE chat\_history (  
id SERIAL PRIMARY KEY,  
user\_question TEXT,  
bot\_answer TEXT,  
kb\_reference\_id INT,  
similarity\_score FLOAT,  
created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP  
);

---

# **7\. Knowledge Base Import**

JSON Format

\[  
{  
"question": "Is multi-factor authentication enabled?",  
"answer": "Yes MFA is required for privileged accounts.",  
"category": "Access Control"  
}  
\]

When importing data:

1 Generate embeddings for each question  
2 Store embeddings in pgvector column

---

# **8\. Semantic Search Implementation**

Process:

1 Receive user question  
2 Generate embedding vector  
3 Run similarity search

SQL example

SELECT  
question,  
answer,  
1 \- (embedding \<=\> query\_embedding) AS similarity  
FROM knowledge\_base  
ORDER BY similarity DESC  
LIMIT 1;

Decision logic:

If similarity \>= 0.80  
Return answer

If similarity \< 0.80  
Return "No answer found"

---

# **9\. REST API Design**

## **Knowledge Base APIs**

POST /api/kb/add  
GET /api/kb/list  
PUT /api/kb/update  
DELETE /api/kb/delete/{id}

---

## **Audit APIs**

POST /api/audit/upload

Uploads questionnaire file.

GET /api/audit/results/{auditId}

Returns processed answers.

---

## **Chatbot API**

POST /api/chat

Request

{  
"question": "Is MFA enabled?"  
}

Response

{  
"answer": "Yes MFA is required.",  
"confidence": 0.92,  
"source": "knowledge\_base"  
}

---

# **10\. Frontend Pages**

Dashboard

Upload Audit Questionnaire

Audit Results

Knowledge Base Manager

Chatbot Interface

Admin Settings

---

# **11\. Chatbot Interface Design**

Chat layout

User bubble (right)

Bot bubble (left)

Display:

Answer  
Matched question  
Confidence score

Example:

User  
Do you encrypt cardholder data?

Bot  
Yes. Cardholder data is encrypted using AES-256.

Confidence  
91%

---

# **12\. File Upload Processing**

When questionnaire is uploaded:

1 Parse file  
2 Extract question column  
3 For each question  
4 Run semantic search  
5 Store result

Display in table

Question  
Suggested Answer  
Confidence  
Action

---

# **13\. Admin Features**

Admins can:

Add knowledge base entries  
Edit answers  
Delete entries  
Bulk import datasets  
View chatbot analytics

---

# **14\. Security Requirements**

Authentication required

Role based access control

Admin role for knowledge base changes

Audit logs for all actions

Encrypted database connections

---

# **15\. Logging**

System must log:

User logins

Knowledge base changes

Chatbot queries

Audit questionnaire uploads

---

# **16\. Local Development Setup**

Install

Java 17  
NodeJS  
PostgreSQL  
Docker

---

## **Start Database**

docker run \-p 5432:5432  
\-e POSTGRES\_PASSWORD=admin  
ankane/pgvector

---

## **Run Backend**

cd backend

./gradlew bootRun

---

## **Run Frontend**

cd frontend

npm install

npm run dev

---

# **17\. Docker Deployment**

Use docker-compose.

Services:

postgres  
backend  
frontend

Expose ports:

Backend 8080  
Frontend 3000  
Postgres 5432

---

# **18\. Future Enhancements**

PDF questionnaire extraction

Integration with external compliance frameworks

Machine learning answer suggestions

Multi-tenant SaaS support

Role-based knowledge bases

---

# **19\. Development Tasks for AI Coding Agent**

The coding agent must generate:

Spring Boot backend project

React frontend application

PostgreSQL schema

Vector search integration

Chatbot UI

Excel upload processing

Docker deployment files

---

# **20\. Expected Output**

A complete working web application that:

Automates cybersecurity audit responses  
Provides knowledge base semantic search  
Includes chatbot answering from knowledge base  
Supports audit questionnaire uploads

---

END OF SPECIFICATION

