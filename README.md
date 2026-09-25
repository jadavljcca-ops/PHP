# Python Programming &mdash; Practical Lab Manual & Admin Panel

An interactive, responsive, static educational website based on the **LJCCA BS(CA) Semester 5 Python Programming Practical Lab Manual**. It includes all 62 solved Python practical programs across 4 syllabus units with aim, logic, program code, outputs, and graphical charts, along with a dedicated, non-intrusive **Admin Panel** that allows instructors to manage practical questions locally in the browser without any database or backend server.

---

## 📌 Project Overview

- **Project Name:** Python Programming &mdash; Practical Lab Manual | LJCCA
- **Target Audience:** BS(CA) Semester 5 Computer Applications students and faculty.
- **Reference Website:** [https://parthjoshiljcca.github.io/python-practicals.app/](https://parthjoshiljcca.github.io/python-practicals.app/)
- **Core Functionality:**
  - Browse 62 solved practical programs organized into 4 units:
    - **Unit I:** Introduction to Python, Data Types and Control Flow Statements (11 programs)
    - **Unit II:** Arrays, Functions, List, Tuples and Dictionaries (18 programs)
    - **Unit III:** Concepts of OOP and Exception Handling (17 programs)
    - **Unit IV:** Python Database Management, Data Analysis and Data Visualization (16 programs)
  - Ambient terminal boot sequence typing animation.
  - Matrix-style ambient binary/Python glyph code rain on HTML5 Canvas.
  - Real-time client-side search per unit and across all fields.
  - Expandable accordion question cards with aim, logic, syntax-highlighted code, line numbering, one-click code copy, and real program outputs/charts.
  - Separate Admin Panel for CRUD operations, live previews, and JSON import/export.

---

## 🛠️ Technologies Used

- **HTML5:** Semantic markup, canvas animations, and modal overlays.
- **Vanilla CSS3:** Custom design tokens, glassmorphism, clay buttons, smooth gradients, line numbering via CSS counters, and responsive media queries (No Tailwind or bulky frameworks).
- **Vanilla JavaScript (ES6+):** Modular client-side architecture (`data.js`, `storage.js`, `auth.js`, `app.js`, `admin.js`), DOM manipulation, pure JS Python syntax highlighter, and `localStorage` persistence.
- **100% Static:** Requires **no backend**, **no Node.js/PHP server**, and **no external database** (no MySQL, MongoDB, Firebase, or Supabase).

---

## 🚀 How to Run Locally

Because this project is a purely static website, you do not need any backend setup or build step:

### Option 1: Direct File Opening
Simply double-click or open `index.html` in any modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).

### Option 2: Using a Simple Local Server (Recommended for testing)
If you prefer running through a local web server:

**Using Python (if installed):**
```bash
python -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000)

**Using Node.js `npx serve`:**
```bash
npx serve .
```
Open the URL shown in terminal (usually [http://localhost:3000](http://localhost:3000)).

**Using VS Code Live Server:**
Right click `index.html` and select **"Open with Live Server"**.

---

## 🌐 How to Deploy on GitHub Pages

This project is tailored specifically for **GitHub Pages** deployment:
- All asset paths are **relative** (`./css/style.css`, `./js/app.js`, `./assets/images/...`), ensuring the website works on custom subpaths such as `https://<USERNAME>.github.io/<REPOSITORY-NAME>/`.
- Includes a `.nojekyll` file in the root directory to disable Jekyll processing.

### Deployment Steps:
1. Initialize git and commit the files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Python Practicals website with Admin Panel"
   ```
2. Create a new repository on [GitHub](https://github.com/new).
3. Link your remote repository and push:
   ```bash
   git remote add origin https://github.com/<USERNAME>/<REPOSITORY-NAME>.git
   git branch -M main
   git push -u origin main
   ```
4. In your GitHub repository:
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   - Select branch **`main`** and folder **`/ (root)`**, then click **Save**.
5. Wait 1–2 minutes, and your site will be live at:
   ```
   https://<USERNAME>.github.io/<REPOSITORY-NAME>/
   ```

---

## 🔐 Admin Panel & Authentication

### Accessing the Admin Panel
- Click the **"Admin"** button located at the top-right of the header masthead on `index.html`.
- Alternatively, click **"⚙️ Admin Panel"** in the floating navigation menu or the footer link.
- Or directly navigate to:
  ```
  admin.html
  ```

### Default Credentials
- **Username:** `admin`
- **Password:** `admin123`

### Changing Admin Credentials
You can change your credentials in two ways:
1. **Directly in Admin Dashboard (Recommended):**
   - Click the **"🔑 Change Credentials"** button in the header.
   - Enter your current password, your new username, and your new password.
   - Click **"Save New Credentials"**. Your new login details are securely stored in your browser's `localStorage`.
   - A **"Reset to Default"** button is also available if you ever want to revert back to `admin / admin123`.

2. **In Code Configuration:**
   - Open [`js/auth.js`](file:///d:/PHP/js/auth.js) and update `DEFAULT_ADMIN_USERNAME` and `DEFAULT_ADMIN_PASSWORD` at the top of the file:
   ```javascript
   const DEFAULT_ADMIN_USERNAME = "admin";
   const DEFAULT_ADMIN_PASSWORD = "admin123";
   ```

### Static-Site Security Notice
This is a static educational site running entirely client-side. The login is designed for basic access control without a server. Do not store sensitive personal information or passwords.

---

## 📝 Admin Panel Features & Workflow

### 1. Adding a New Question
1. Log in to `admin.html`.
2. Click the **"+ Add New Practical"** button.
3. Fill in the fields:
   - **Unit:** Select Unit I, II, III, or IV.
   - **Practical Number:** Enter numeric order (e.g. `12`).
   - **Display Tag:** Automatically generated (e.g. `Q12`).
   - **Title / Aim:** Question title.
   - **Category / Topic:** Subject area (e.g. `OOP`, `Control Flow`).
   - **Logic / Explanation:** Explanation of code concepts.
   - **Python Code:** Python program code (supports tab key indentation).
   - **Output:** Output text.
   - **Optional Chart:** Path or URL to chart image (if applicable).
4. Click **"Save Practical"**. The question will immediately be saved to `localStorage` and will appear on both the Admin table and the student website.

### 2. Editing an Existing Question
1. Click **"Edit"** on any question row in the Admin table.
2. Update any fields.
3. Click **"Save Practical"**.

### 3. Deleting a Question
1. Click **"Delete"** on any question row.
2. Confirm the action in the confirmation modal.
3. The question will be removed from your browser dataset.

### 4. Previewing a Question
Click **"Preview"** on any row to open a live modal displaying the exact student card layout (with logic, formatted code, copy button, output, and chart).

### 5. Searching and Filtering in Admin
- Search live by title, code, logic, tag, category, or practical number.
- Filter by Unit (Unit I–IV) and by Category.

### 6. Managing Syllabus Units (Add, Edit, Delete Units)
Instructors can easily add and edit syllabus units directly from multiple places in the Admin Panel:
1. **Direct Action Button:** Click the green **"+ Add New Unit"** button directly on the dashboard action bar.
2. **Dedicated Dashboard Tab:** Click the **"📁 Syllabus Units & Modules"** tab on the main dashboard to view all units in a full-width management table with program counts, **✏️ Edit**, and **🗑️ Delete** buttons.
3. **Quick Unit Editor in Practical Form:** While creating or editing a practical question, use the **`+ Add Unit`** or **`✏️ Edit Selected Unit`** quick action links right beside the Unit dropdown without losing your work.
4. **Interactive Unit Badge:** In the Questions table, click the unit badge (e.g. `Unit I ✏️`) to jump straight to editing that unit.
5. **Add Unit Fields:** Enter Unit Identifier (e.g. `Unit V`), Unit Title (e.g. `Advanced Python & Web Frameworks`), and Subtitle/Description. Click **"Save Unit"**.
6. **Edit Unit:** Click **"✏️ Edit"** to change the unit's number, title, or summary. All practical questions assigned to that unit are automatically kept in sync.
7. **Delete Unit:** Click **"🗑️ Delete"** with confirmation, choosing whether to also delete questions belonging to that unit.

All additions and edits to units immediately reflect in:
- The syllabus overview cards on `index.html`
- The student accordion sections and per-unit search bars
- The floating jump menu navigation
- The terminal boot sequence compilation lines
- All unit selection dropdowns and statistics counters

### 7. Theme Toggle (Dark & Light Mode)
The Admin Panel includes an interactive sliding toggle switch:
- **🌙 Dark Mode (Default):** Deep space dark background with **pure white font color (`#ffffff`)** for all text, headings, table rows, form inputs, and modals.
- **☀️ Light Mode:** Clean light background with **pure black font color (`#000000`)** across all elements, inputs, badges, and tables for high contrast and readability.
- **Persistent Preference:** Your chosen theme is automatically saved to browser storage (`python_practicals_admin_theme`) so your selection remains intact across sessions and page reloads.
- **Access Anywhere:** The toggle is available on both the Login screen and the main Dashboard header.

---

## 💾 How `localStorage` Works & Important Limitation

### How it Works:
- On first visit, the site loads the default 62 practicals bundled inside [`js/data.js`](file:///d:/PHP/js/data.js).
- When any addition, edit, or deletion is performed in the Admin Panel, the updated dataset is saved to the browser's `localStorage` under the key `python_practicals_questions_v1`.
- Both `index.html` and `admin.html` always read from `localStorage` first, ensuring students immediately see any modifications made in that browser.

### ⚠️ Important Limitation of Static Storage:
> **Notice:** Because there is NO server or database, data is stored **in this browser only**. Changes made on one device or browser will **not automatically sync** to another device or browser.

---

## 📤 Exporting & Importing Question Data

### 1. Export as PDF (.pdf):
1. In the Admin Dashboard actions bar, click the red **"📄 Export Questions (.PDF)"** button.
2. The browser instantly generates and downloads:
   ```
   python-practicals-lab-manual.pdf
   ```
   This is a complete, beautifully formatted printable PDF manual containing all units, question titles, aims, logic summaries, syntax-formatted Python code, outputs, and page numbers in `.pdf` format.

### 2. Backup & Export as JSON:
1. Click **"💾 Backup JSON"** in the action bar.
2. Downloads:
   ```
   python-practicals-data.json
   ```
   This file contains raw structured data for moving your questions between computers or browsers.

### 3. Importing Data:
1. On another browser or computer, open `admin.html`.
2. Click **"Import JSON"** and select your `python-practicals-data.json` file.
3. The system validates the JSON schema:
   - If invalid: Displays `"Invalid question data format."`
   - If valid: Displays `"Questions imported successfully."` and loads the new dataset into `localStorage`.

### 4. Resetting Defaults:
Click **"Reset to Defaults"** anytime to restore the original 62 practicals.

---

## 📂 Project Directory Structure

```
/
├── index.html                   # Main student website (faithful replica of reference site)
├── admin.html                   # Admin Panel with login and dashboard
├── .nojekyll                    # GitHub Pages Jekyll bypass flag
├── README.md                    # Project documentation
├── css/
│   ├── style.css                # Student site styling & shared glass/clay design system
│   └── admin.css                # Admin dashboard layout, tables, modals, & toast styles
├── js/
│   ├── data.js                  # Default dataset of 62 solved Python practicals across 4 units
│   ├── storage.js               # Data layer (localStorage CRUD, search, syntax highlighter, import/export)
│   ├── auth.js                  # Configurable admin credentials and session authentication
│   ├── app.js                   # Student site interaction logic (code rain, boot sequence, search)
│   ├── jspdf.umd.min.js         # Offline client-side PDF generation engine (no backend)
│   └── admin.js                 # Admin panel interaction logic (table, editor, preview, modals)
└── assets/
    ├── images/
    │   ├── favicon.png          # Site favicon
    │   ├── ljcca_logo.png       # LJCCA college crest logo
    │   ├── python_logo.png      # Official Python logo
    │   ├── chart_unit-4-q12.png # Matplotlib bar graph output
    │   ├── chart_unit-4-q13.png # Double bar graph output
    │   ├── chart_unit-4-q14.png # Histogram output
    │   ├── chart_unit-4-q15.png # Pie chart output
    │   └── chart_unit-4-q16.png # Line graph profit output
    └── icons/                   # Vector icons
```

---

## 🎓 Credit

- **Original Curriculum and Lab Manual Content:** Prof. Parth D. Joshi, Assistant Professor, LJCCA &mdash; BS(CA) Semester 5, Python Programming.
- **Reference Website:** [parthjoshiljcca.github.io/python-practicals.app](https://parthjoshiljcca.github.io/python-practicals.app/)
#   P H P  
 #   P H P  
 