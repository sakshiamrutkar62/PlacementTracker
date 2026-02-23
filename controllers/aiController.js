// Fix for fetch in Node.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

// UPDATED STRATEGIES based on your actual available models
const STRATEGIES = [
    { model: "gemini-2.5-flash", version: "v1beta" },      // Your best model
    { model: "gemini-2.0-flash", version: "v1beta" },      // Backup
    { model: "gemini-flash-latest", version: "v1beta" },    // Safety net
    { model: "gemini-pro-latest", version: "v1beta" }       // Fallback
];

// Core AI call helper - polyglot failover
async function callGemini(prompt) {
    // FIX: Check if API_KEY is configured
    if (!API_KEY) {
        console.error('[AI ERROR] GEMINI_API_KEY not configured in environment');
        return null;
    }

    for (const strategy of STRATEGIES) {
        try {
            const URL = `https://generativelanguage.googleapis.com/${strategy.version}/models/${strategy.model}:generateContent?key=${API_KEY}`;
            const response = await fetch(URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            const data = await response.json();
            if (data.error) { continue; }
            // FIX: Add null checks for nested properties
            if (data.candidates &&
                data.candidates[0] &&
                data.candidates[0].content &&
                data.candidates[0].content.parts &&
                data.candidates[0].content.parts[0] &&
                data.candidates[0].content.parts[0].text) {
                return data.candidates[0].content.parts[0].text;
            }
        } catch (error) {
            console.error(`[AI ERROR] ${strategy.model}: ${error.message}`);
        }
    }
    return null;
}

exports.generateQuiz = async (req, res) => {
    const { skill } = req.body;
    console.log(`\n[AI START] Attempting to generate quiz for: ${skill}...`);

    const prompt = `Act as a Technical Interviewer. Generate 5 multiple-choice questions (MCQ) for the skill '${skill}'.
                            
STRICT OUTPUT RULES:
1. Return ONLY a valid JSON array.
2. Do NOT use markdown code blocks (no \`\`\`json).
3. Format: [{"question": "...", "options": ["A","B","C","D"], "correctIndex": 0}]
4. Make questions progressively harder (1=easy, 5=very hard).`;

    const rawText = await callGemini(prompt);

    if (rawText) {
        try {
            let cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonStart = cleaned.indexOf('[');
            const jsonEnd = cleaned.lastIndexOf(']') + 1;
            if (jsonStart !== -1) cleaned = cleaned.substring(jsonStart, jsonEnd);
            const quizData = JSON.parse(cleaned);
            console.log(`[AI SUCCESS] Quiz generated!`);
            return res.json({ success: true, quiz: quizData });
        } catch (e) {
            console.error('[AI PARSE ERROR]', e.message);
        }
    }

    // --- EMERGENCY BACKUP ---
    console.error("[AI FATAL] All Google Models failed. Serving Emergency Quiz.");
    const emergencyQuiz = [
        { question: `What is the primary purpose of ${skill}?`, options: ["Data storage", "Building applications", "Network communication", "All of the above"], correctIndex: 3 },
        { question: `Which paradigm is ${skill} most associated with?`, options: ["Procedural", "Object-Oriented", "Functional", "Depends on usage"], correctIndex: 3 },
        { question: `What is a common use case of ${skill} in production?`, options: ["Frontend UI", "Backend APIs", "Data pipelines", "All are valid"], correctIndex: 3 },
        { question: `Which tool pairs best with ${skill} for deployment?`, options: ["Docker", "Jenkins", "AWS", "All of the above"], correctIndex: 3 },
        { question: `Best practice when using ${skill} in team environments?`, options: ["Version control", "Code reviews", "Testing", "All of the above"], correctIndex: 3 }
    ];
    res.json({ success: true, quiz: emergencyQuiz });
};

exports.getFeedback = async (req, res) => {
    const { skill, score, total } = req.body;
    const pct = Math.round((score / (total || 5)) * 100);

    const prompt = `A student scored ${score} out of ${total || 5} (${pct}%) on a ${skill} quiz.
Write 3 sentences of personalized feedback:
1. Acknowledge their performance.
2. Identify the most important concept they should study in ${skill}.
3. Suggest ONE free resource (like a YouTube channel, official docs, or website) to improve.
Keep it encouraging and concise. Return plain text only.`;

    const text = await callGemini(prompt);

    if (text) {
        return res.json({ feedback: text.trim() });
    }

    // Fallback feedback
    const fallbacks = {
        pass: `Great job on your ${skill} quiz! Your score of ${score}/${total || 5} shows solid understanding. Keep building practical projects to reinforce your knowledge. Check out the official documentation for deeper insights.`,
        fail: `You scored ${score}/${total || 5} on ${skill} - don't be discouraged! Focus on the fundamentals first, particularly core concepts and syntax. FreeCodeCamp and YouTube channels like Traversy Media are excellent free resources to build your confidence.`
    };
    res.json({ feedback: pct >= 80 ? fallbacks.pass : fallbacks.fail });
};

exports.getSkillGap = async (req, res) => {
    const { userSkills, targetRole, requiredSkills } = req.body;

    const missingSkills = (requiredSkills || []).filter(
        s => !(userSkills || []).map(u => u.toLowerCase()).includes(s.toLowerCase())
    );

    if (missingSkills.length === 0) {
        return res.json({
            gapSkills: [],
            plan: "You already have all the required skills for this role! Focus on building projects to demonstrate your experience."
        });
    }

    const prompt = `A student wants to become a ${targetRole || 'Software Engineer'}.
They have: ${(userSkills || []).join(', ') || 'no skills listed yet'}.
They are missing: ${missingSkills.join(', ')}.

Create a concise 30-day learning plan in JSON format:
{
  "summary": "one sentence overview",
  "weeks": [
    { "week": 1, "focus": "skill name", "goal": "what to achieve", "resource": "free resource URL or name" },
    { "week": 2, ... },
    { "week": 3, ... },
    { "week": 4, ... }
  ],
  "tip": "one motivational tip"
}
Return ONLY valid JSON, no markdown.`;

    const rawText = await callGemini(prompt);

    if (rawText) {
        try {
            let cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonStart = cleaned.indexOf('{');
            const jsonEnd = cleaned.lastIndexOf('}') + 1;
            if (jsonStart !== -1) cleaned = cleaned.substring(jsonStart, jsonEnd);
            const plan = JSON.parse(cleaned);
            return res.json({ gapSkills: missingSkills, plan });
        } catch (e) {
            console.error('[SKILL GAP PARSE ERROR]', e.message);
        }
    }

    // Fallback
    res.json({
        gapSkills: missingSkills,
        plan: {
            summary: `You need to learn ${missingSkills.length} skill(s) to qualify.`,
            weeks: missingSkills.slice(0, 4).map((s, i) => ({
                week: i + 1, focus: s,
                goal: `Complete beginner to intermediate ${s} tutorial`,
                resource: `Search "${s} tutorial" on YouTube or FreeCodeCamp`
            })),
            tip: "Consistency beats intensity. 1 hour daily is better than 7 hours once a week!"
        }
    });
};


