const express = require('express');
const router = express.Router();

// System prompt to give the AI context about the website
const SYSTEM_PROMPT = `
You are the AI Help Bot for the Citizen Complaint Portal (CMS). 
Your job is to assist users with their queries about the portal.

PORTAL DETAILS:
- Name: Citizen Complaint Portal (CMS)
- Roles: Users (Citizens), Officers, Admins.
- Users can: Register, Login, File Complaints (Categories: Cyber Crime, Water Issue, Electricity Issue, Road Damage, Public Safety, Garbage Issue), Track Complaints using a Complaint ID (e.g., CMP-123456789), and Rate services after resolution.
- Officers can: View assigned tasks, Update case status (Pending, In Progress, Resolved), Upload resolution proof, and view their analytics.
- Admins can: View all complaint data, Assign cases to officers, Manage system users, and View departmental analytics.

IMPORTANT INFO:
- Resolution Time: Usually 3-7 working days.
- Support: Users can upload images or documents as evidence.
- Emergency Contacts: Police (100), Ambulance (102), Fire (101).

Always be polite, helpful, and concise. If you don't know the answer, tell them to contact the admin.
`;

router.post('/', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        const API_KEY = process.env.AI_API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ message: "AI API Key not configured on server" });
        }

        // Using OpenRouter for AI (supports the sk-or-v1 keys)
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                // 'HTTP-Referer': 'https://wt-team2.vercel.app', // Optional for OpenRouter
                // 'X-Title': 'Citizen Complaint Portal' // Optional for OpenRouter
            },
            body: JSON.stringify({
                model: "google/gemini-flash-1.5", // Good balance of speed and smarts
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: message }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("OpenRouter Error Details:", errorData);
            return res.status(response.status).json({ 
                message: "AI Service Error", 
                details: errorData.error ? errorData.error.message : "Unknown error"
            });
        }

        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
            console.error("No choices returned from AI:", data);
            return res.status(500).json({ message: "No response from AI service" });
        }

        const botReply = data.choices[0].message.content;
        res.json({ reply: botReply });

    } catch (err) {
        console.error("Chat Route Error:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

module.exports = router;
