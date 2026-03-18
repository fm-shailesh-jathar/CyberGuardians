Codex Prompt — Audit Upload Modal (Flexmoney Security Dashboard)

Create a modal component titled:

"Upload — Flexmoney Security Dashboard Audit"

The modal should include the following fields and functionality:

🔹 1. Lender / Auditor

Type: Dropdown (select + creatable)

Label: Lender / Auditor

Options:

HDFC Bank

IDFC Bank

ICICI Bank

Home Credit

Feature:

Allow users to create a new lender tag dynamically if not listed

🔹 2. Audit Type

Type: Dropdown

Label: Audit Type

Options:

Vendor Audit

Third Party Risk Assessment

InfoSec Audit

🔹 3. Submission Deadline

Type: Date Picker / Input

Label: Submission Deadline

Format: dd/mm/yyyy

Validation:

Mandatory field

Must not allow empty submission

🔹 4. Questionnaire File Upload

Type: File Upload Button

Label: Questionnaire File

Button Text: Choose File

Supported Formats:

CSV

XLSX

DOCX

(PDF support planned for future — show note)

UI Hint:

Display text:
"Supported: CSV, XLSX, DOCX (PDF = future)"

Behavior:

Show selected file name after upload

Show "No file selected" if empty

🔹 5. Actions

Cancel Button

Closes modal without saving

Upload & Process Button

Validates all required fields

On success:

Uploads file

Triggers audit processing

Maps uploaded audit to Lender Audit Dashboard

Shows progress status (loading/progress indicator)

🔹 6. Additional Behavior

Modal should be closable via:

Close (X) icon

Cancel button

Form validation errors should be clearly displayed

UI style:

Modern dark theme (as per image)

Clean spacing and rounded inputs

Highlight active fields

🔹 7. Data Mapping Logic

Uploaded audit must:

Appear in Lender Audit section/dashboard

Retain:

Selected lender

Audit type

Submission deadline

Uploaded file reference

Progress/status should reflect in Lender Audit view

🔹 8. Optional Enhancements (Future-ready)

Drag & drop file upload

File preview (for CSV/XLSX)

PDF support handling

Validation for file size/type