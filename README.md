# 🎓 Smart Student Placement Manager (AI-Powered)

> **"The Bridge Between Students and Their Dream Jobs"**

---

## 👋 What is this project?

Imagine a smart assistant that helps college students find jobs and helps colleges manage the entire placement process smoothly.

This project is a **web application** (like a website) where:

1.  **Students** can upload their resumes, find jobs, and apply with one click.
2.  **Placement Officers (TPOs)** can post new jobs, see who applied, and shortlist the best candidates.
3.  **AI (Artificial Intelligence)** reads the student's resume automatically to find their skills!

---

## 🚀 Features (What can you do?)

### 👨🎓 For Students

- **Easy Login:** Create your account and log in securely.
- **Resume "Magic" Scanner:** key feature! Just upload your PDF resume, and our smart AI automatically reads it to find your skills (like Python, Java, Leadership, etc.).
- **Job Feed:** See a list of all companies hiring, their packages (salary), and requirements.
- **One-Click Apply:** Found a job you like? Apply instantly.
- **Track Status:** Check if you are "Applied", "Shortlisted", or "Rejected" in real-time. No more guessing!

### 👔 For Placement Officers (TPOs)

- **Post Jobs:** Easily add new company openings with details like salary, role, and deadlines.
- **Manage Applicants:** See a neat list of all students who applied for each job.
- **Decision Making:** "Shortlist" or "Reject" students with a simple button click.
- **View Resumes:** Access student resumes instantly to check their details.

---

## 🛠️ How it Works (Under the Hood)

_Note for the curious:_

- **The "Face" (Frontend):** We use **HTML, CSS, and JavaScript** to make the website look modern and beautiful (Glassmorphism design).
- **The "Brain" (Backend):** We use **Node.js** to handle all the logic (like saving data, logging in, etc.).
- **The "Memory" (Database):** We use **Supabase (PostgreSQL)** to safely store all user details, jobs, and applications.
- **The "Vault" (Storage):** We safely store your PDF resumes in the cloud.
- **The "Guard" (Security):** We use special tools to stop hackers and spammers (Rate Limiting & Encryption).

---

## 🚦 How to Run the Project (Step-by-Step)

If you want to run this project on your own computer, follow these simple steps:

### 1. Requirements

Make sure you have **Node.js** installed on your computer. (It's the software that runs our server).

### 2. Install the Tools

Open your folder in a terminal (command prompt) and type this command to download all necessary "parts" (dependencies):

```bash
npm install
```

### 3. Setup the Keys

Copy the provided template to a new `.env` file and fill in your credentials:

```bash
cp .env.example .env
```

Then edit `.env` with your actual Supabase URL, keys, JWT secret, and email credentials.
_(See `.env.example` for all required variables.)_

### 4. Start the Engine!

**Production:**

```bash
npm start
```

**Development (auto-restarts on file changes):**

```bash
npm run dev
```

You should see a message saying: `[INFO] ENTERPRISE SERVER running on port 3000`.

### 5. Visit the App

Open your web browser (Chrome, Edge, etc.) and go to:
**[http://localhost:3000](http://localhost:3000)**

---

## 📁 Project Folders Explained

- **`public/`**: Contains the visual parts of the website (HTML pages, CSS styles, images).
- **`routes/`**: The paths the website takes (like /login or /apply).
- **`controllers/`**: The logic behind every action (what happens when you click a button).
- **`server.js`**: The main file that starts everything.

---

# 📚 Ultimate Learning Guide: "From Basics to Advanced"

_(Designed for Non-Technical Students & Clients)_

This section explains EVERY concept used in this project in the simplest way possible.

---

## 🏗️ 1. The Building Blocks (Frontend)

### 🏠 HTML (The Skeleton)

Think of HTML as the **structure of a house**.

- It defines where the walls, doors, and windows (buttons, text, images) go.
- In this project, files like `index.html` and `dashboard.html` are the skeletons of our pages.

### 🎨 CSS (The Interior Design)

HTML is plain and boring. **CSS is the paint, decoration, and style.**

- It makes the buttons look shiny, adds colors, and ensures the layout looks good on phones and laptops.
- We used a style called **"Glassmorphism"** which makes elements look like frosted glass (transparent and blurry), giving it a very modern, premium feel.

### 🧠 JavaScript (The Magic/Muscle)

If HTML is the body and CSS is the clothes, **JavaScript is the brain.**

- It handles interaction. When you click "Apply", JavaScript sends a message to the server.
- It updates the page _without_ reloading it (like when you switch tabs instantly).

---

## ⚙️ 2. The Engine Room (Backend)

### 🖥️ Node.js & Express (The Chef)

Imagine a restaurant:

- **You (The Client):** Sitting at a table (Browser).
- **The Menu (API):** List of things you can ask for (Login, Get Jobs).
- **The Waiter (API Routes):** Takes your order to the kitchen.
- **The Chef (Node.js/Express):** Cooks the order (processes data).

In our project, `server.js` is the main Chef. It waits for requests (like "Please log me in") and decides what to do.

### 🛣️ API Routes (The System)

How does the app know what to do? We have specific "Paths":

- `/auth/login` -> Handles login.
- `/jobs/all` -> Fetches the list of jobs.
- `/apply` -> Submits your application.
  These are defined in the `routes/` folder.

---

## 🗄️ 3. The Memory Bank (Database & Storage)

### 📊 Supabase (PostgreSQL)

We don't store data in a simple text file because it's unsafe and slow. We use a **Relational Database** called PostgreSQL (managed by Supabase).

- Think of it like a giant, super-fast Excel sheet with strict rules.
- We have "Tables" for:
  - **Users:** Stores finding (Name, Email, Password).
  - **Jobs:** Stores job details.
  - **Applications:** Links a User to a Job.

### ☁️ Cloud Storage (The Vault)

Databases are for text. For files (like your PDF Resume), we use **Cloud Storage**.

- When you upload a resume, it flies up to a secure server (the cloud).
- We get back a unique "link" (URL) to that file, which we save in the database.
- This keeps the app fast and lightweight.

---

## 🤖 4. The Artificial Intelligence (AI)

### 📄 Resume Parsing (The Reader)

How does the computer know you know Python?

1.  **Upload:** You upload a PDF.
2.  **Extraction:** We use a tool (`pdf2json`) to convert the PDF into plain text.
3.  **Analysis:** The code scans this text for special keywords (Skills) like "Java", "C++", "Leadership", "Communication".
4.  **Tagging:** It saves these skills to your profile automatically.
    _This saves you from typing everything manually!_

---

## 🛡️ 5. Security (The Bodyguards)

### 🔑 Authentication (JWT)

- **Problem:** How does the server know it's _you_ when you browse?
- **Solution:** When you log in, we give you a digital "ID Card" called a **Token (JWT)**.
- Every time you ask for data, you show this ID card automatically. If the card is fake or expired, the server kicks you out.

### 🔒 Password Hashing (Bcrypt)

- **Problem:** What if a hacker steals the database? They would see everyone's passwords!
- **Solution:** We **Hash** passwords. If your password is `12345`, we turn it into something like `$2b$10$X8...`.
- Even we (the developers) cannot read your real password. We only know the hash.

### 🛑 Rate Limiting (The Crowd Control)

- **Problem:** Someone could write a bot to try logging in 1,000 times a second to crash the server.
- **Solution:** We use a "Speed Breaker". If one person tries too many times in 1 minute, we block them temporarily.

---

> **Developed for Final Year Project 2026**
> _Simplifying Placements, One Click at a Time._
