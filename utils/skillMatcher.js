const pool = require('../config/db');
const supabase = require('../config/supabaseClient');

/**
 * Calculate match ratio between user's verified skills and job/internship required skills
 * @param {Array} userVerifiedSkills - Array of user's verified skills
 * @param {Array} requiredSkills - Array of required skills for the job/internship
 * @returns {Object} Match information with ratio, matched skills, and missing skills
 */
function calculateMatchRatio(userVerifiedSkills, requiredSkills) {
    if (!Array.isArray(userVerifiedSkills)) userVerifiedSkills = [];
    if (!Array.isArray(requiredSkills)) requiredSkills = [];

    if (requiredSkills.length === 0) {
        return {
            matchRatio: 100,
            matchPercentage: 100,
            matchedSkills: [],
            missingSkills: [],
            matchedCount: 0,
            totalRequired: 0
        };
    }

    // Normalize skills to lowercase for comparison
    const userSkillsLower = userVerifiedSkills.map(s => String(s).toLowerCase().trim());
    const requiredSkillsLower = requiredSkills.map(s => String(s).toLowerCase().trim());

    // Find matched and missing skills
    const matchedSkills = requiredSkillsLower.filter(reqSkill =>
        userSkillsLower.some(userSkill =>
            userSkill === reqSkill ||
            userSkill.includes(reqSkill) ||
            reqSkill.includes(userSkill)
        )
    );

    const missingSkills = requiredSkillsLower.filter(reqSkill =>
        !matchedSkills.includes(reqSkill)
    );

    // Map back to original case for display
    const matchedSkillsOriginal = matchedSkills.map(matched => {
        const original = requiredSkills.find(s => s.toLowerCase().trim() === matched);
        return original || matched;
    });

    const missingSkillsOriginal = missingSkills.map(missing => {
        const original = requiredSkills.find(s => s.toLowerCase().trim() === missing);
        return original || missing;
    });

    const matchCount = matchedSkills.length;
    const totalRequired = requiredSkills.length;
    const matchRatio = totalRequired > 0 ? (matchCount / totalRequired) * 100 : 0;

    return {
        matchRatio: Math.round(matchRatio * 100) / 100, // Round to 2 decimal places
        matchPercentage: Math.round(matchRatio),
        matchedSkills: matchedSkillsOriginal,
        missingSkills: missingSkillsOriginal,
        matchedCount: matchCount,
        totalRequired: totalRequired
    };
}

/**
 * Get all internships/jobs with match ratios for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of jobs with match information
 */
async function getJobsWithMatchRatios(userId) {
    try {
        // Get user's verified skills
        const userResult = await pool.query(
            'SELECT verified_skills FROM users WHERE id = $1',
            [userId]
        );

        const userVerifiedSkills = userResult.rows[0]?.verified_skills || [];

        // Get all internships/jobs
        const { data: jobs, error } = await supabase
            .from('internships')
            .select('*')
            .order('posted_at', { ascending: false });

        if (error) {
            console.error('Error fetching jobs:', error);
            return [];
        }

        // Calculate match ratios for each job
        const jobsWithMatches = (jobs || []).map(job => {
            const requiredSkills = Array.isArray(job.required_skills)
                ? job.required_skills
                : [];

            const matchInfo = calculateMatchRatio(userVerifiedSkills, requiredSkills);

            return {
                ...job,
                matchInfo: {
                    ...matchInfo,
                    isPerfectMatch: matchInfo.matchPercentage === 100,
                    isGoodMatch: matchInfo.matchPercentage >= 70,
                    isPartialMatch: matchInfo.matchPercentage >= 40 && matchInfo.matchPercentage < 70,
                    isPoorMatch: matchInfo.matchPercentage < 40
                }
            };
        });

        // Sort by match ratio (highest first)
        return jobsWithMatches.sort((a, b) =>
            b.matchInfo.matchPercentage - a.matchInfo.matchPercentage
        );
    } catch (err) {
        console.error('Error in getJobsWithMatchRatios:', err);
        return [];
    }
}

module.exports = {
    calculateMatchRatio,
    getJobsWithMatchRatios
};

