const supabase = require('../config/supabaseClient');
const { getJobsWithMatchRatios } = require('../utils/skillMatcher');
require('dotenv').config();

// 1. SUBMIT QUIZ & VERIFY SKILL
exports.submitQuiz = async (req, res) => {
    const { skill_name, score, passed } = req.body;
    const user_id = req.user.id; // Always use authenticated user — never trust body user_id

    // 1. Log the attempt in 'quiz_attempts'
    const { error: logError } = await supabase
        .from('quiz_attempts')
        .insert([{ user_id, skill_name, score, passed }]);

    if (logError) return res.status(400).json({ error: logError.message });

    // 2. If Passed, Update User Profile and Calculate Match Ratios
    if (passed) {
        // Fetch current skills
        const { data: user, error: fetchError } = await supabase.from('users').select('verified_skills').eq('id', user_id).single();

        if (fetchError || !user) return res.status(400).json({ error: 'Failed to fetch user data' });

        let newSkills = user.verified_skills || [];

        // Avoid duplicates
        const skillAlreadyVerified = newSkills.some(s => s.toLowerCase() === skill_name.toLowerCase());
        
        if (!skillAlreadyVerified) {
            newSkills.push(skill_name);

            // Update DB
            const { error: updateError } = await supabase
                .from('users')
                .update({ verified_skills: newSkills })
                .eq('id', user_id);

            if (updateError) return res.status(400).json({ error: updateError.message });

            // NEW: Automatically calculate match ratios for all jobs/internships
            const jobsWithMatches = await getJobsWithMatchRatios(user_id);
            
            // Get top 5 best matches
            const topMatches = jobsWithMatches
                .filter(job => job.matchInfo.matchPercentage > 0)
                .slice(0, 5)
                .map(job => ({
                    id: job.id,
                    company_name: job.company_name,
                    role_title: job.role_title,
                    matchPercentage: job.matchInfo.matchPercentage,
                    matchedSkills: job.matchInfo.matchedSkills,
                    missingSkills: job.matchInfo.missingSkills
                }));

            return res.json({ 
                message: "Skill Verified Successfully!",
                verifiedSkill: skill_name,
                totalVerifiedSkills: newSkills.length,
                topMatches: topMatches,
                matchInfo: {
                    totalJobsAnalyzed: jobsWithMatches.length,
                    perfectMatches: jobsWithMatches.filter(j => j.matchInfo.isPerfectMatch).length,
                    goodMatches: jobsWithMatches.filter(j => j.matchInfo.isGoodMatch).length
                }
            });
        }
    }

    res.json({ message: passed ? "Skill Verified Successfully!" : "Quiz Failed. Try again later." });
};

// 2. GET QUIZ HISTORY
exports.getQuizHistory = async (req, res) => {
    const user_id = req.user.id;
    const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ status: 'success', data: data || [] });
};