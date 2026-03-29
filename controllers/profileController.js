const pool = require('../config/db');
const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');
const PDFParser = require("pdf2json");

function getResumeBucketCandidates() {
    const configuredBucket =
        process.env.SUPABASE_STORAGE_BUCKET ||
        process.env.SUPABASE_BUCKET ||
        'resumes';

    // Try configured bucket first, then common defaults.
    return [...new Set([configuredBucket, 'resumes', 'resume'])];
}

exports.getProfile = async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, full_name, email, role, resume_link, skills, verified_skills, batch_year, college_verified FROM users WHERE id = $1',
            [req.user.id]
        );
        if (!result.rows[0]) return next(new AppError('User not found', 404));
        res.json({ status: 'success', data: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

exports.uploadResume = async (req, res, next) => {
    // 1. Check File
    if (!req.file) return next(new AppError('No file uploaded', 400));

    // --- AI PARSING ---
    const parsePDF = (buffer) => {
        return new Promise((resolve, reject) => {
            const pdfParser = new PDFParser(null, 1); // FIX: use null not this
            pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
            pdfParser.on("pdfParser_dataReady", pdfData => {
                const rawText = pdfParser.getRawTextContent();
                try { resolve(decodeURIComponent(rawText)); }
                catch (e) { resolve(rawText); }
            });
            pdfParser.parseBuffer(buffer);
        });
    };

    let foundSkills = [];
    try {
        const resumeTextRaw = await parsePDF(req.file.buffer);
        const resumeText = (resumeTextRaw || "").toLowerCase();

        // Expanded skill dictionary for better detection
        const possibleSkills = [
            'python', 'java', 'javascript', 'typescript', 'react', 'reactjs', 'angular',
            'vue', 'vuejs', 'node', 'nodejs', 'express', 'sql', 'mysql', 'postgresql',
            'mongodb', 'redis', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git',
            'html', 'css', 'sass', 'tailwind', 'bootstrap', 'excel', 'cpp', 'c++',
            'c#', 'golang', 'go', 'rust', 'swift', 'kotlin', 'php', 'laravel',
            'django', 'flask', 'fastapi', 'spring', 'springboot', 'graphql', 'rest',
            'power bi', 'tableau', 'dotnet', '.net', 'machine learning', 'deep learning',
            'data analysis', 'data science', 'tensorflow', 'pytorch', 'scikit',
            'cybersecurity', 'penetration testing', 'blockchain', 'solidity', 'iot',
            'linux', 'bash', 'shell', 'jenkins', 'ci/cd', 'devops', 'agile', 'scrum',
            'figma', 'photoshop', 'ui/ux', 'flutter', 'dart', 'react native', "compiler constructor"
        ];

        foundSkills = possibleSkills.filter(skill => resumeText.includes(skill));
        // Normalize: remove duplicates like 'node' and 'nodejs'
        foundSkills = [...new Set(foundSkills)];
        // Capitalize for display
        foundSkills = foundSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1));
    } catch (parseErr) {
        console.warn("⚠️ PDF Parsing failed (Non-fatal):", parseErr);
    }
    // -----------------------------------------

    // 2. Upload to Supabase Storage
    try {
        const fileName = `resume_${req.user.id}_${Date.now()}.pdf`;

        let uploadedBucket = null;
        let lastStorageError = null;

        for (const bucket of getResumeBucketCandidates()) {
            const { error } = await supabase
                .storage
                .from(bucket)
                .upload(fileName, req.file.buffer, {
                    contentType: 'application/pdf',
                    upsert: true
                });

            if (!error) {
                uploadedBucket = bucket;
                break;
            }

            lastStorageError = error;
            console.warn(`[SUPABASE] Upload failed for bucket "${bucket}":`, error.message || error);
        }

        if (!uploadedBucket) {
            const reason = lastStorageError?.message || 'Unknown storage error';
            return next(new AppError(`Storage upload failed: ${reason}`, 500));
        }

        const { data: urlData } = supabase
            .storage
            .from(uploadedBucket)
            .getPublicUrl(fileName);

        const publicURL = urlData.publicUrl;

        // 3. SAVE RESUME LINK AND SKILLS TO DB
        // Fetch current verified_skills so we can cross-reference with new resume skills
        const { rows: [userRow] } = await pool.query('SELECT verified_skills FROM users WHERE id = $1', [req.user.id]);
        const existingVerified = Array.isArray(userRow?.verified_skills) ? userRow.verified_skills : [];
        // Only keep verified skills that still appear in the new resume — prevents cross-resume contamination
        const newFoundLower = foundSkills.map(s => s.toLowerCase());
        const cleanedVerified = existingVerified.filter(v => newFoundLower.includes(v.toLowerCase()));

        await pool.query(
            'UPDATE users SET resume_link = $1, skills = $2, verified_skills = $3 WHERE id = $4',
            [publicURL, foundSkills, cleanedVerified, req.user.id]
        );

        // 4. Match Jobs (Immediate Feedback) - Fixed to use internships table
        let matchedJobs = [];
        if (foundSkills.length > 0) {
            const lowerSkills = foundSkills.map(s => s.toLowerCase());
            const conditions = lowerSkills.map((_, i) => `$${i + 1} = ANY(required_skills)`).join(' OR ');
            const jobResult = await pool.query(
                `SELECT id, company_name, role_title, stipend, type FROM internships WHERE ${conditions} ORDER BY posted_at DESC LIMIT 5`,
                lowerSkills
            );
            matchedJobs = jobResult.rows;
        }

        res.json({
            status: 'success',
            message: 'Resume uploaded successfully!',
            resume_url: publicURL,
            skills_identified: foundSkills,
            recommended_jobs: matchedJobs
        });

    } catch (err) {
        console.error("❌ Server Error:", err);
        next(err);
    }
};