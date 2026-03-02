const https = require('https');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

console.log("[INFO] Requesting available models from Google AI...");

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => { data += chunk; });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("❌ API Error:", json.error.message);
            } else if (json.models) {
                console.log("\n[SUCCESS] Available models:");
                console.log("------------------------------------------------");
                json.models.forEach(m => {
                    // We only care about models that support 'generateContent'
                    if (m.supportedGenerationMethods.includes("generateContent")) {
                        console.log(`Name: ${m.name}`); // This is the EXACT string we need
                        console.log(`Desc: ${m.displayName}`);
                        console.log("------------------------------------------------");
                    }
                });
            } else {
                console.log("[WARNING] No models found. API Service may need 5-10 minutes to propagate.");
            }
        } catch (e) {
            console.error("Parse Error:", e.message);
        }
    });

}).on('error', (err) => {
    console.error("Network Error:", err.message);
});