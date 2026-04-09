const { User, Skill, UserSkill, Internship } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const logger = require('../utils/logger');
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
    return [...new Set([configuredBucket, 'resumes', 'resume', 'user-uploads', 'resume-storage', 'student-resumes'])];
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
    if (!req.file) return next(new AppError('No file uploaded', 400));

    try {
        const fileBuffer = req.file.buffer;
        const fileName = `${req.user.id}-${Date.now()}${path.extname(req.file.originalname)}`;

        let extractedSkills = [];
        let pdfText = '';
        
        // Parse PDF using pdf2json (suppress console warnings)
        try {
            // Temporarily suppress console.warn to hide "fake worker" warning
            const originalWarn = console.warn;
            console.warn = () => {};
            
            const pdfParser = new PDFParser(null, 1);
            
            await new Promise((resolve, reject) => {
                pdfParser.on("pdfParser_dataError", errData => reject(new Error(errData.parserError)));
                pdfParser.on("pdfParser_dataReady", pdfData => {
                    try {
                        pdfText = pdfData.Pages.map(page => 
                            page.Texts.map(text => decodeURIComponent(text.R[0].T)).join(" ")
                        ).join(" ");
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                });
                
                pdfParser.parseBuffer(fileBuffer);
            });
            
            // Restore console.warn
            console.warn = originalWarn;
            
            logger.info(`PDF parsed successfully - ${pdfText.length} characters extracted`);
            logger.info('PDF text preview:', pdfText.substring(0, 500));
        } catch (parseError) {
            logger.error('PDF parsing failed:', parseError);
            return res.status(400).json({ 
                message: 'Failed to parse PDF file. Please ensure it is a valid, unencrypted PDF.' 
            });
        }

        // Extract skills from parsed text
        try {
            const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });

            // Helper function to escape special regex characters
            const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            extractedSkills = allSkills.filter(skill => {
                const escapedSkill = escapeRegex(skill.name);
                // Use case-insensitive search with word boundaries or spaces around skill
                // For skills with special chars (C++, C#), also check without word boundaries
                const hasSpecialChars = /[+#.]/.test(skill.name);
                
                if (hasSpecialChars) {
                    // For C++, C#, Node.js - match with spaces/start/end around them
                    const pattern = `(^|\\s)${escapedSkill}(\\s|$|\\.|,)`;
                    return new RegExp(pattern, 'i').test(pdfText);
                } else {
                    // For regular words, use word boundaries
                    return new RegExp(`\\b${escapedSkill}\\b`, 'i').test(pdfText);
                }
            }).map(skill => skill.name);

            await UserSkill.destroy({ where: { userId: req.user.id } });
            if (extractedSkills.length > 0) {
                const skillsFromDb = await Skill.findAll({ where: { name: extractedSkills } });
                const skillsToInsert = skillsFromDb.map(s => ({ userId: req.user.id, skillId: s.id }));
                if (skillsToInsert.length > 0) {
                    await UserSkill.bulkCreate(skillsToInsert, { ignoreDuplicates: true });
                }
            }
        } catch (skillError) {
            logger.error('Skill extraction error:', skillError);
            // Continue even if skill extraction fails - still upload the resume
        }

        const bucketCandidates = getResumeBucketCandidates();
        let uploadError = null;
        let publicURL = null;
        let bucketUsed = null;

        for (const bucket of bucketCandidates) {
            const { data, error } = await supabase
                .storage
                .from(bucket)
                .upload(fileName, fileBuffer, {
                    contentType: 'application/pdf',
                    upsert: true
                });

            if (!error) {
                uploadError = null;
                bucketUsed = bucket;
                break;
            }

            uploadError = error;
            logger.warn(`[SUPABASE] Upload failed for bucket "${bucket}":`, error.message || error);
        }

        if (uploadError) {
            logger.error('All Supabase bucket uploads failed. Possible causes: 1. Bucket "resumes" does not exist. 2. Service role key is wrong. 3. Bucket permissions/RLS blocking upload.', uploadError);
            return next(new AppError(`Storage upload failed: ${uploadError.message || 'Check Supabase bucket existence and permissions.'}`, 500));
        }

        const { data: urlData } = supabase
            .storage
            .from(bucketUsed)
            .getPublicUrl(fileName);

        if (!urlData || !urlData.publicUrl) {
            logger.error(`[SUPABASE] Could not get public URL for bucket: ${bucketUsed}`);
            return next(new AppError('Failed to generate resume URL', 500));
        }

        publicURL = urlData.publicUrl;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            logger.error(`[UPLOAD ERROR] User ${req.user.id} not found in database during resume update`);
            return next(new AppError('User not found during profile update', 404));
        }

        const existingVerified = Array.isArray(user.verified_skills) ? user.verified_skills : [];
        const newFoundLower = extractedSkills.map(s => s.toLowerCase());
        const cleanedVerified = existingVerified.filter(v => newFoundLower.includes(v.toLowerCase()));

        user.resume_link = publicURL;
        user.skills = extractedSkills;
        user.verified_skills = cleanedVerified;
        
        try {
            await user.save();
        } catch (saveError) {
            logger.error('[DATABASE ERROR] Failed to save user profile with resume details:', saveError);
            return next(new AppError('Resume uploaded but failed to update profile in database.', 500));
        }

        let matchedJobs = [];
        if (extractedSkills.length > 0) {
            const lowerSkills = extractedSkills.map(s => s.toLowerCase());

            matchedJobs = await Internship.findAll({
                where: {
                    required_skills: {
                        [Op.overlap]: lowerSkills
                    }
                },
                limit: 5,
                order: [['posted_at', 'DESC']]
            });
        }

        res.json({
            status: 'success',
            message: 'Resume uploaded successfully!',
            resume_url: publicURL,
            skills_identified: extractedSkills,
            recommended_jobs: matchedJobs
        });

    } catch (err) {
        logger.error("Server Error in uploadResume:", err);
        next(err);
    }
};