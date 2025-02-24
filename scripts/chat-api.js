export async function getChatbotResponse(prompt, apiUrl) {
    try {
        if (!apiUrl) throw new Error("API URL is required.");
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: prompt })
        });
        if (!response.ok) throw new Error("Network error");
        const data = await response.json();
        return data.answer || "No answer received.";
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}