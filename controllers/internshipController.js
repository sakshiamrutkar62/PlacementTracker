const { getJobsWithMatchRatios, calculateMatchRatio } = require('../utils/skillMatcher');
const pool = require('../config/db');
const supabase = require('../config/supabaseClient');
require('dotenv').config();
const { Internship } = require('../models');
const AppError = require('../utils/appError');

// 1. POST A NEW INTERNSHIP (Admin Only)
exports.createInternship = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return next(new AppError('You do not have permission to perform this action', 403));
    }
    try {
        const { company_name, role_title, description, stipend, duration, mode, type, location, required_skills, deadline } = req.body;

        // Validation
        if (!company_name || !role_title) {
            return res.status(400).json({ error: "Company name and role title are required." });
        }

        const skillsArray = Array.isArray(required_skills)
            ? required_skills
            : (required_skills ? String(required_skills).split(',').map(s => s.trim()).filter(Boolean) : []);

        const { data, error } = await supabase
            .from('internships')
            .insert([{
                company_name,
                role_title,
                description,
                stipend,
                duration,
                mode,
                type: type || 'Internship',
                location,
                required_skills: skillsArray,
                deadline
            }]);

        if (error) return res.status(400).json({ error: error.message });

        res.status(201).json({ message: "Internship posted successfully!", data });
    } catch (err) {
        console.error('Error creating internship:', err.message);
        next(err);
    }
};

// 2. GET ALL INTERNSHIPS (With Filtering Support)
exports.getAllInternships = async (req, res) => {
    const parseSkills = (raw) => {
        if (Array.isArray(raw)) return raw.map(s => String(s).trim()).filter(Boolean);
        if (!raw) return [];
        if (typeof raw === 'string') {
            return raw
                .replace(/[{}"]/g, '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
        }
        return [];
    };

    try {
        const { data: internships, error: internshipsError } = await supabase
            .from('internships')
            .select('*')
            .order('posted_at', { ascending: false });

        if (internshipsError) return res.status(400).json({ error: internshipsError.message });

        const internshipRows = (internships || []).map(row => ({
            ...row,
            source_table: 'internships',
            apply_enabled: true,
            required_skills: parseSkills(row.required_skills)
        }));

        const unifiedData = internshipRows;

        if (req.user && req.user.id) {
            try {
                const userResult = await pool.query(
                    'SELECT verified_skills FROM users WHERE id = $1',
                    [req.user.id]
                );
                const userVerifiedSkills = userResult.rows[0]?.verified_skills || [];

                const jobsWithMatches = unifiedData.map(job => {
                    const requiredSkills = parseSkills(job.required_skills);
                    const matchInfo = calculateMatchRatio(userVerifiedSkills, requiredSkills);

                    return {
                        ...job,
                        required_skills: requiredSkills,
                        matchInfo: {
                            ...matchInfo,
                            isPerfectMatch: matchInfo.matchPercentage === 100,
                            isGoodMatch: matchInfo.matchPercentage >= 70,
                            isPartialMatch: matchInfo.matchPercentage >= 40 && matchInfo.matchPercentage < 70,
                            isPoorMatch: matchInfo.matchPercentage < 40
                        }
                    };
                });

                jobsWithMatches.sort((a, b) => {
                    if (b.matchInfo.matchPercentage !== a.matchInfo.matchPercentage) {
                        return b.matchInfo.matchPercentage - a.matchInfo.matchPercentage;
                    }
                    return new Date(b.posted_at || 0) - new Date(a.posted_at || 0);
                });

                return res.json(jobsWithMatches);
            } catch (matchError) {
                console.error('Error calculating match ratios:', matchError);
            }
        }

        res.json(unifiedData);
    } catch (err) {
        console.error('Error fetching opportunities:', err.message);
        res.status(500).json({ error: 'Failed to fetch opportunities' });
    }
};

// 3. SEARCH INTERNSHIPS (With filters)
exports.searchInternships = async (req, res) => {
    const { q, mode, type } = req.query;
    let query = supabase.from('internships').select('*').order('posted_at', { ascending: false });

    if (mode && mode !== 'all') query = query.eq('mode', mode);
    if (type && type !== 'all') query = query.eq('type', type);

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    let results = data || [];
    if (q && q.trim()) {
        const term = q.trim().toLowerCase();
        results = results.filter(job =>
            (job.company_name || '').toLowerCase().includes(term) ||
            (job.role_title || '').toLowerCase().includes(term) ||
            (job.required_skills || []).some(s => s.toLowerCase().includes(term))
        );
    }

    res.json(results);
};
