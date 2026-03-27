const express = require('express');
const router = express.Router();

// System prompt to give the AI context about the website
const SYSTEM_PROMPT = `
You are sahayAi, the dedicated AI Assistant for the NivaranSetu (CMS) Portal. 
Your job is to assist users with their queries about the portal, complaints, and navigation.

PORTAL DETAILS:
- Name: NivaranSetu (CMS)
- Assistant Name: sahayAi
- Roles: Users (Citizens), Officers, Admins.
- Users can: Register, Login, File Complaints (Categories: Cyber Crime, Water Issue, Electricity Issue, Road Damage, Public Safety, Garbage Issue), Track Complaints using a Complaint ID (e.g., CMP-123456789), and Rate services after resolution.
- Officers can: View assigned tasks, Update case status (Pending, In Progress, Resolved), Upload resolution proof, and view their analytics.
- Admins can: View all complaint data, Assign cases to officers, Manage system users, and View departmental analytics.

IMPORTANT INFO:
- Resolution Time: Usually 3-7 working days.
- Support: Users can upload images or documents as evidence.
- Emergency Contacts: Police (100), Ambulance (102), Fire (101).

Always identify yourself as sahayAi when asked. Be polite, helpful, and concise. If you don't know the answer, tell them to contact the admin.
`;

router.post('/', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
        if (!API_KEY) {
            console.error("AI CHAT ERROR: GEMINI_API_KEY is missing in .env");
            return res.status(500).json({ message: "Gemini API Key not configured on server" });
        }

        console.log(`AI CHAT: Sending request to Gemini API...`);

        // Using Google Gemini API directly (free tier)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: SYSTEM_PROMPT }]
                    },
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: message }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            return res.status(response.status).json({
                message: "AI Service Error",
                details: errorData.error ? errorData.error.message : "Unknown error from Gemini"
            });
        }

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
            console.error("No candidates returned from Gemini:", data);
            return res.status(500).json({ message: "No response from Gemini AI" });
        }

        const botReply = data.candidates[0].content.parts[0].text;
        res.json({ reply: botReply });

    } catch (err) {
        console.error("Chat Route Error:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

module.exports = router;
