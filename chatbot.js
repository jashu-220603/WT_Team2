/**
 * Chatbot Integration for Citizen Complaint Portal
 */

function toggleChat() {
    const chat = document.getElementById("chatbox");
    if (chat.style.display === "flex") {
        chat.style.display = "none";
    } else {
        chat.style.display = "flex";
    }
}

async function sendMessage() {
    const input = document.getElementById("userInput");
    const chatBody = document.getElementById("chatBody");
    const userText = input.value.trim();

    if (!userText) return;

    // Add User Message
    const userMsg = document.createElement("p");
    userMsg.className = "user-msg";
    userMsg.innerText = userText;
    chatBody.appendChild(userMsg);

    input.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;

    // Add Typing Indicator
    const typingIndicator = document.createElement("p");
    typingIndicator.className = "bot-msg typing";
    typingIndicator.innerText = "Bot is typing...";
    chatBody.appendChild(typingIndicator);
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:7000'}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: userText })
        });

        const data = await response.json();
        chatBody.removeChild(typingIndicator);

        const botMsg = document.createElement("p");
        botMsg.className = "bot-msg";
        
        if (response.ok && data.reply) {
            botMsg.innerText = data.reply;
        } else {
            botMsg.innerText = data.details || data.message || "I'm sorry, I'm having trouble connecting to my brain right now.";
            console.error("Chat Error Response:", data);
        }
        
        chatBody.appendChild(botMsg);

    } catch (err) {
        console.error("Chatbot network error:", err);
        chatBody.removeChild(typingIndicator);
        
        const errorMsg = document.createElement("p");
        errorMsg.className = "bot-msg";
        errorMsg.innerText = "Connection error. Please check if the backend is live.";
        chatBody.appendChild(errorMsg);
    }

    chatBody.scrollTop = chatBody.scrollHeight;
}

// Allow pressing Enter to send message
document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById("userInput");
    if (userInput) {
        userInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                sendMessage();
            }
        });
    }
});
