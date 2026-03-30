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
    if (!req.file) return next(new AppError('No file uploaded', 400));

    try {
        const fileBuffer = req.file.buffer;
        const fileName = `${req.user.id}-${Date.now()}${path.extname(req.file.originalname)}`;

        let extractedSkills = [];
        try {
            const pdfParser = new PDFParser(this, 1);
            pdfParser.parseBuffer(fileBuffer);
            const pdfData = await new Promise((resolve, reject) => {
                pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
                pdfParser.on("pdfParser_dataReady", pdfData => resolve(pdfData));
            });
            const pdfText = pdfData.Pages.map(page => page.Texts.map(text => decodeURIComponent(text.R[0].T)).join(" ")).join(" ");

            const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
            const skillNames = allSkills.map(s => s.name.toLowerCase());

            extractedSkills = allSkills.filter(skill =>
                new RegExp(`\\b${skill.name.toLowerCase()}\\b`, 'i').test(pdfText)
            ).map(skill => skill.name);

            await UserSkill.destroy({ where: { userId: req.user.id } });
            if (extractedSkills.length > 0) {
                const skillsFromDb = await Skill.findAll({ where: { name: extractedSkills } });
                const skillsToInsert = skillsFromDb.map(s => ({ userId: req.user.id, skillId: s.id }));
                if (skillsToInsert.length > 0) {
                    await UserSkill.bulkCreate(skillsToInsert, { ignoreDuplicates: true });
                }
            }
        } catch (parseError) {
            logger.error('PDF parsing error:', parseError);
            return res.status(400).json({ message: 'Failed to parse PDF file. It may be corrupted or in an unsupported format.' });
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
            logger.error('All Supabase bucket uploads failed.', uploadError);
            return next(new AppError(`Storage upload failed: ${uploadError.message}`, 500));
        }

        const { data: urlData } = supabase
            .storage
            .from(bucketUsed)
            .getPublicUrl(fileName);

        publicURL = urlData.publicUrl;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return next(new AppError('User not found', 404));
        }

        const existingVerified = Array.isArray(user.verified_skills) ? user.verified_skills : [];
        const newFoundLower = extractedSkills.map(s => s.toLowerCase());
        const cleanedVerified = existingVerified.filter(v => newFoundLower.includes(v.toLowerCase()));

        user.resume_link = publicURL;
        user.skills = extractedSkills;
        user.verified_skills = cleanedVerified;
        await user.save();

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