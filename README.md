# Smart Student Placement Manager

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-blue.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success.svg)]()

> An AI-powered platform connecting students with their dream careers through intelligent resume parsing and automated job matching.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Technical Documentation](#technical-documentation)

---

## Overview

The Smart Student Placement Manager is an enterprise-grade web application designed to streamline the campus recruitment process. It serves as a comprehensive platform for:

- **Students**: Resume management, job discovery, and application tracking
- **Placement Officers**: Job posting, applicant management, and candidate evaluation
- **AI Integration**: Automated skill extraction from resumes using advanced parsing algorithms

### Key Capabilities

- Automated resume parsing with AI-powered skill extraction
- Real-time application status tracking
- Intelligent job matching based on candidate skills
- Secure authentication with JWT tokens
- Cloud-based resume storage with Supabase
- Role-based access control for students and administrators

---

## Features

### For Students

- **Secure Authentication**: Create accounts and log in with encrypted credentials
- **AI Resume Parser**: Upload PDF resumes for automatic skill extraction using advanced parsing algorithms
- **Job Discovery**: Browse comprehensive listings with salary ranges, requirements, and company details
- **One-Click Applications**: Apply to positions instantly with pre-filled profile information
- **Real-Time Tracking**: Monitor application status (Applied, Shortlisted, Rejected) with live updates

### For Placement Officers

- **Job Management**: Post new opportunities with detailed requirements and deadlines
- **Applicant Dashboard**: View organized lists of candidates for each position
- **Candidate Evaluation**: Shortlist or reject applicants with streamlined decision workflows
- **Resume Access**: Instant access to candidate resumes and verified skill profiles

---

## Technology Stack

### Frontend

- **HTML5/CSS3**: Modern, responsive design with Glassmorphism UI
- **JavaScript (ES6+)**: Client-side interactivity and dynamic content
- **Fetch API**: Asynchronous HTTP requests

### Backend

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **JWT**: JSON Web Tokens for secure authentication
- **Bcrypt**: Password hashing and encryption

### Database & Storage

- **PostgreSQL**: Relational database via Supabase
- **Supabase Storage**: Cloud-based file storage for resumes

### AI & Parsing

- **pdf2json**: PDF text extraction
- **Google Gemini AI**: Advanced AI features (optional)

### Security

- **Helmet.js**: Security headers
- **Express Rate Limit**: DDoS protection
- **HPP**: HTTP Parameter Pollution prevention
- **CORS**: Cross-Origin Resource Sharing

---

## Installation

### Prerequisites

Ensure the following software is installed on your system:

#### Required

**Node.js v18.0.0+** (LTS recommended)

- Download: [https://nodejs.org](https://nodejs.org)
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

#### Optional

**Git** - For repository cloning

- Download: [https://git-scm.com/downloads](https://git-scm.com/downloads)

**Visual Studio Code** - Recommended code editor

- Download: [https://code.visualstudio.com](https://code.visualstudio.com)

---

### Step 1: Obtain Project Files

**Method A: Download ZIP Archive**

1. Download the project as a ZIP file
2. Extract to your preferred directory (e.g., `C:\Projects\placement-tracker`)

**Method B: Clone with Git**

```bash
git clone <repository-url>
cd placement-tracker
```

---

### Step 2: Install Dependencies

Open a terminal in the project root directory and execute:

**Windows (PowerShell):**

```powershell
cd C:\Users\YourName\Desktop\placement-tracker
npm install
```

**Mac/Linux (Terminal):**

```bash
cd ~/Desktop/placement-tracker
npm install
```

**Note:** Installation typically takes 2-3 minutes. Expected output:

```
added 234 packages in 45s
```

---

## Configuration

### Step 3: Environment Variables Setup

Create a `.env` file in the project root directory (same level as `server.js`).

**Quick Start:** Copy `.env.example` to `.env` and update the values.

```env
# ==============================================
# SERVER CONFIGURATION
# ==============================================
PORT=3000
NODE_ENV=production

# ==============================================
# DATABASE (Supabase PostgreSQL)
# ==============================================
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
DATABASE_URL=postgresql://postgres:your_password@db.xxxxxxxxxxxxxx.supabase.co:5432/postgres

# ==============================================
# SUPABASE API & STORAGE
# ==============================================
SUPABASE_URL=https://xxxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=your_service_role_key_here

# ==============================================
# AUTHENTICATION
# ==============================================
JWT_SECRET=your_super_secret_random_string_min_32_characters

# ==============================================
# EMAIL (Optional - for password reset)
# ==============================================
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# ==============================================
# AI FEATURES (Optional)
# ==============================================
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## Database Setup

### Step 4: Supabase Configuration

#### 4.1 Create Supabase Project

1. Navigate to [https://supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project:
   - **Project Name:** `placement-tracker`
   - **Database Password:** Choose a secure password (save this credential)
   - **Region:** Select the geographically closest region

#### 4.2 Database Connection String

1. In Supabase Dashboard: **Settings** > **Database**
2. Locate **Connection String** section
3. Select the **URI** tab
4. Copy the connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your database password
6. Paste into `DATABASE_URL` in `.env`

#### 4.3 API Credentials

1. Navigate to **Settings** > **API**
2. Copy the following values:
   - **Project URL** → Paste into `SUPABASE_URL`
   - **service_role key** (secret) → Paste into `SUPABASE_KEY`

**Important:** Use the `service_role` key (not `anon` key) for server-side operations.

#### 4.4 Storage Bucket Configuration

1. In Supabase Dashboard: **Storage** section
2. Click **New Bucket**
   - **Bucket Name:** `resumes`
   - **Public Access:** Enable (checked)
3. Click **Create Bucket**

#### 4.5 Database Schema Initialization

1. Navigate to **SQL Editor** in Supabase Dashboard
2. Click **New Query**
3. Copy and execute the following SQL:

```sql
-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student',
    resume_link TEXT,
    skills TEXT[],
    verified_skills TEXT[],
    batch_year INTEGER,
    college_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create Internships Table
CREATE TABLE IF NOT EXISTS internships (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    stipend VARCHAR(100),
    type VARCHAR(50),
    required_skills TEXT[],
    description TEXT,
    deadline DATE,
    posted_at TIMESTAMP DEFAULT NOW()
);

-- Create Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    internship_id INTEGER REFERENCES internships(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'applied',
    applied_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, internship_id)
);

-- Create Indexes for Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_internships_deadline ON internships(deadline);
```

---

## Running the Application

### Step 5: Start the Server

**Option A: Production Mode**

```bash
npm start
```

**Option B: Development Mode** (with auto-reload)

```bash
npm run dev
```

**Expected Console Output:**

```
[INFO] Security middleware initialized
[INFO] Static files served from /public
[INFO] CORS enabled for all origins
[INFO] Database connected successfully
[INFO] ENTERPRISE SERVER running on port 3000
```

**Common Startup Errors:**

- Verify all `.env` variables are set correctly
- Ensure Supabase project is active (not paused)
- Check that port 3000 is not in use by another application

---

### Step 6: Access the Application

Open a web browser and navigate to:

```
http://localhost:3000
```

**Available Routes:**

- **Login Page:** `http://localhost:3000/index.html`
- **Registration:** `http://localhost:3000/register.html`
- **Student Dashboard:** `http://localhost:3000/dashboard.html`
- **Admin Panel:** `http://localhost:3000/admin.html`

---

### Step 7: Create Initial User Account

1. Navigate to `http://localhost:3000/register.html`
2. Complete the registration form:
   - Full Name
   - Email Address
   - Password (minimum 6 characters)
   - Batch Year
3. Click **Register**
4. Login at `http://localhost:3000/index.html` with your credentials

---

## Command Reference

### Common npm Commands

```bash
# Install all project dependencies
npm install

# Start application (production mode)
npm start

# Start application (development mode with nodemon)
npm run dev

# Stop server
# Press Ctrl + C in terminal

# Check installed Node.js version
node --version

# Check installed npm version
npm --version

# Clear npm cache (if installation issues occur)
npm cache clean --force
```

---

## Troubleshooting

### Issue 1: Port Already in Use

**Error Message:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:** Modify port in `.env` file:

```env
PORT=4000
```

Then access application at `http://localhost:4000`

---

### Issue 2: Module Not Found

**Error Message:** `Error: Cannot find module 'express'`

**Solution:** Install dependencies:

```bash
npm install
```

---

### Issue 3: Database Connection Failed

**Error Message:** `Error: connect ECONNREFUSED` or `Database connection failed`

**Solution:**

1. Verify `DATABASE_URL` in `.env` is correct
2. Check Supabase project status (free tier auto-pauses after inactivity)
3. Confirm database password is correct
4. Ensure network connectivity to Supabase servers

---

### Issue 4: JWT Authentication Errors

**Error Message:** `JsonWebTokenError: jwt malformed` or `invalid signature`

**Solution:** Generate a new secure JWT secret:

**Windows PowerShell:**

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Mac/Linux:**

```bash
openssl rand -base64 32
```

Update `JWT_SECRET` in `.env` with the generated value.

---

### Issue 5: Resume Upload Failure

**Error Message:** `Storage upload failed` or `400 Bad Request`

**Solution:**

1. Verify `resumes` storage bucket exists in Supabase
2. Confirm bucket is set to **public**
3. Ensure `SUPABASE_KEY` uses **service_role** key (not anon key)
4. Check bucket permissions in Supabase Dashboard

---

### Issue 6: CORS Errors

**Error Message:** `Access to fetch blocked by CORS policy`

**Solution:**

- Verify server is running on `http://localhost:3000`
- Check browser console for specific CORS error details
- Ensure CORS middleware is properly configured in `server.js`

---

## Project Structure

```
placement-tracker/
├── config/
│   ├── db.js                 # PostgreSQL connection pool
│   ├── email.js              # Nodemailer configuration
│   └── supabaseClient.js     # Supabase client initialization
├── controllers/
│   ├── adminController.js    # Admin panel logic
│   ├── aiController.js       # AI/Gemini integration
│   ├── applicationController.js
│   ├── authController.js     # Authentication & authorization
│   ├── companyController.js
│   ├── internshipController.js
│   ├── profileController.js  # User profile & resume handling
│   └── skillController.js
├── middleware/
│   ├── authMiddleware.js     # JWT verification
│   ├── errorMiddleware.js    # Global error handler
│   └── uploadMiddleware.js   # Multer file upload
├── public/
│   ├── css/
│   │   └── style.css         # Glassmorphism styles
│   ├── js/
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── config.js
│   │   └── dashboard.js
│   ├── admin.html
│   ├── dashboard.html
│   ├── index.html
│   ├── register.html
│   └── reset-password.html
├── routes/
│   ├── apiRoutes.js
│   ├── applicationRoutes.js
│   ├── authRoutes.js
│   ├── companyRoutes.js
│   └── profileRoutes.js
├── utils/
│   ├── appError.js           # Custom error class
│   ├── logger.js             # Logging utility
│   └── skillMatcher.js       # Skill matching algorithm
├── .env                      # Environment variables (create this)
├── .env.example              # Environment template
├── package.json              # Project dependencies
├── server.js                 # Application entry point
└── README.md                 # This file
```

---

## Technical Documentation

### Architecture Overview

The application follows a three-tier architecture:

1. **Presentation Layer** (Frontend)
   - HTML/CSS/JavaScript SPA (Single Page Application)
   - Client-side routing and state management
   - Fetch API for backend communication

2. **Application Layer** (Backend)
   - Express.js RESTful API
   - JWT-based stateless authentication
   - Middleware pipeline for request processing

3. **Data Layer** (Database)
   - PostgreSQL relational database
   - Supabase cloud infrastructure
   - Connection pooling for performance

### Authentication Flow

```
1. User submits credentials
2. Server validates against database
3. bcrypt verifies hashed password
4. JWT token generated with user payload
5. Token stored in localStorage (client)
6. Subsequent requests include token in Authorization header
7. Middleware validates token on protected routes
```

### Resume Parsing Process

```
1. User uploads PDF via multipart/form-data
2. Multer middleware processes file to buffer
3. pdf2json extracts raw text content
4. Skill dictionary matches keywords
5. Extracted skills saved to user profile
6. File uploaded to Supabase Storage
7. Public URL returned and saved to database
```

### Database Schema

**Users Table**

- Stores student/admin profiles
- Encrypted passwords (bcrypt)
- Array fields for skills and verified_skills

**Internships Table**

- Job/internship postings
- Required skills stored as array
- Deadline tracking

**Applications Table**

- Links users to internships
- Status tracking (applied, shortlisted, rejected)
- Composite unique constraint prevents duplicate applications

### Security Measures

1. **Password Security**
   - bcrypt hashing (10 rounds)
   - No plaintext storage

2. **SQL Injection Prevention**
   - Parameterized queries ($1, $2, etc.)
   - Input validation via express-validator

3. **XSS Protection**
   - Helmet.js security headers
   - Content Security Policy

4. **DDoS Mitigation**
   - Rate limiting (100 requests/15 minutes)
   - Request throttling

5. **Authentication**
   - JWT with expiration
   - Secure token storage

---

## Deployment Considerations

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
```

### Recommended Hosting Platforms

- **Backend**: Heroku, Railway, Render
- **Database**: Supabase (cloud-hosted PostgreSQL)
- **Storage**: Supabase Storage
- **Frontend**: Netlify, Vercel (if separated)

### Performance Optimizations

1. Enable PostgreSQL connection pooling
2. Implement Redis caching for frequently accessed data
3. Compress static assets (gzip/brotli)
4. Use CDN for static file delivery
5. Implement database query optimization and indexing

---

## Updating the Application

To pull and deploy the latest changes:

```bash
# Stop the running server
# Press Ctrl + C

# Pull latest code (if using Git)
git pull origin main

# Install new dependencies (if package.json changed)
npm install

# Restart server
npm start
```

---

## Support

For technical issues or questions:

1. Check console/terminal for error messages
2. Verify all environment variables are configured
3. Ensure Supabase project is active and accessible
4. Confirm no port conflicts exist

---

## License

This project is licensed under the MIT License - see LICENSE file for details.

---

## Credits

**Developed for Final Year Project 2026**  
Enterprise-grade placement management system with AI integration.

---

**Version:** 1.0.0  
**Last Updated:** March 2026  
**Node.js:** v18.0.0+  
**Status:** Production Ready
