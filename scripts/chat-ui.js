import { getChatbotResponse } from './chat-api.js';

class ChatWidget extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.maxMessages = 20;
        this.chatHistory = [];

        this.apiUrl = this.getAttribute("api-url") || "";
        this.botName = this.getAttribute("bot-name") || "Answerbot";
        this.logoUrl = this.getAttribute("logo-url") || "../images/img.png";
        // this.lang = this.getAttribute("lang") || "en"; TODO: Check if this is needed, breaks the app

        this.translations = {};
        this.loadTranslationsAndRender(this.getAttribute("lang") || "en");
        // this.render();
    }

    static get observedAttributes() {
        return ["api-url", "bot-name", "logo-url", "lang"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (name === "api-url") this.apiUrl = newValue;
            if (name === "bot-name") this.botName = newValue;
            if (name === "logo-url") this.logoUrl = newValue;
            if (name === "lang") {
                this.lang = newValue;
                this.loadTranslationsAndRender(newValue);
            } else {
                this.render();
            }
        }
    }

    async loadTranslationsAndRender(lang) {
        this.translations = await this.loadTranslations(lang);
        this.render();
    }

    async loadTranslations(lang = "en") {
        try {
            const response = await fetch(`../translations/${lang}.json`);
            if (!response.ok) throw new Error("Translation file not found");
            return await response.json();
        } catch (error) {
            console.error("Error loading translations:", error);
            return {};
        }
    }

    t(key) {
        return this.translations[key] || key;
    }

    render() {
        while (this.shadowRoot.firstChild) {
            this.shadowRoot.removeChild(this.shadowRoot.firstChild);
        }

        const linkElem = document.createElement("link");
        linkElem.rel = "stylesheet";
        linkElem.href = "styles/chat.css";
        this.shadowRoot.appendChild(linkElem);

        const toggleBtn = document.createElement("button");
        toggleBtn.id = "chatToggle";
        toggleBtn.textContent = this.t("chat_toggle");
        this.shadowRoot.appendChild(toggleBtn);

        const container = document.createElement("div");
        container.id = "chatContainer";
        const logo = this.logoUrl ? `<img src="${this.logoUrl}" alt="Logo" class="bot-logo">` : "";
        const enableClearButton = this.chatHistory.length < 1;

        container.innerHTML = `
            <div id="chatHeader">
            ${logo}
                <span id="welcomeMessage">${this.botName}</span>
                <button id="closeButton">&times;</button>
            </div>
            <div id="chatHistory"></div>
            <div id="loadingIndicator">${this.t("loading")}</div>
            <div id="chatInputContainer">
                <input type="text" id="chatInput" placeholder="${this.t("placeholder")}" />
                <button id="sendButton">${this.t("sendButton")}</button>
                <button id="clearButton" ${enableClearButton ? "disabled" : ""} >${this.t("clearButton")}</button>
            </div>
            <div id="chatFooter">* ${this.botName} ${this.t("footer")}</div>
        `;
        this.shadowRoot.appendChild(container);
        container.style.display = "none";

        this.addEventListeners();
        this.appendMessage("bot", this.t("greeting"));
    }

    connectedCallback() { //TODO: Check if this is needed, not working
        this.appendMessage("bot", this.t("greeting"));
    }

    addEventListeners() {
        this.shadowRoot.getElementById("sendButton").addEventListener("click", () => this.sendMessage());
        this.shadowRoot.getElementById("clearButton").addEventListener("click", () => this.clearChatHistory());
        this.shadowRoot.getElementById("chatInput").addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.sendMessage();
        });
        this.shadowRoot.getElementById("closeButton").addEventListener("click", () => this.closeChat());
        this.shadowRoot.getElementById("chatToggle").addEventListener("click", () => this.openChat());
    }

    openChat() {
        this.shadowRoot.getElementById("chatContainer").style.display = "flex";
        this.shadowRoot.getElementById("chatToggle").style.display = "none";
    }

    closeChat() {
        this.shadowRoot.getElementById("chatContainer").style.display = "none";
        this.shadowRoot.getElementById("chatToggle").style.display = "block";
    }

    async sendMessage() {
        const input = this.shadowRoot.getElementById("chatInput");
        const button = this.shadowRoot.getElementById("sendButton");
        const clearButton = this.shadowRoot.getElementById("clearButton");
        const loading = this.shadowRoot.getElementById("loadingIndicator");
        const userMessage = input.value.trim();
        if (!userMessage) return;

        let prompt = userMessage;
        if (this.chatHistory.length > 0) {
            const context = this.chatHistory.map(msg => `${msg.sender === "user" ? "Me" : this.botName}: ${msg.text}`).join('\n');
            prompt = `Previous conversation:\n${context}\nQuestion: ${userMessage}`;
        }

        this.appendMessage("user", userMessage);
        this.chatHistory.push({ sender: "user", text: userMessage });

        input.value = "";
        input.disabled = true;
        button.disabled = true;
        clearButton.disabled = true;
        loading.style.display = "block";

        try {
            const reply = await getChatbotResponse(prompt, this.apiUrl);

            const decodedReply = this.decodeHtmlEntities(reply);
            const formattedReply = reply.replace(/\n/g, '<br>');
            // const safeText = this.stripHtml(decodedReply);
            this.appendMessage("bot", formattedReply, true);
            this.chatHistory.push({ sender: "bot", text: formattedReply });
        } catch (error) {
            console.error(error);
            this.appendMessage("bot", this.t("error_message"));
        } finally {
            input.disabled = false;
            button.disabled = false;
            clearButton.disabled = false;
            loading.style.display = "none";
            input.focus();
        }
    }

    appendMessage(sender, text, isHtml = false) {
        const historyDiv = this.shadowRoot.getElementById("chatHistory");
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message", sender);

        const label = document.createElement("span");
        label.classList.add("senderLabel");
        label.textContent = sender === "user" ? `${this.t("me_label")}: ` : `${this.botName}: `;

        const msgText = document.createElement("span");
        msgText.classList.add("messageText");

        if (isHtml) {
            msgText.innerHTML = text;
        } else {
            msgText.textContent = text;
        }

        msgDiv.appendChild(label);
        msgDiv.appendChild(msgText);
        historyDiv.appendChild(msgDiv);
        historyDiv.scrollTop = historyDiv.scrollHeight;

        if (this.chatHistory.length > this.maxMessages) {
            this.chatHistory.shift();
            historyDiv.removeChild(historyDiv.firstChild);
        }
    }

    decodeHtmlEntities(htmlString) {
        const txt = document.createElement("textarea");
        txt.innerHTML = htmlString;
        return txt.value;
    }

    stripHtml(htmlString) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlString;
        return tempDiv.textContent || tempDiv.innerText;
    }

    clearChatHistory() {
        const historyDiv = this.shadowRoot.getElementById("chatHistory");

        if (historyDiv.children.length > 0) {
            while (historyDiv.firstChild) {
                historyDiv.removeChild(historyDiv.firstChild);
            }
            this.chatHistory = [];

            this.appendMessage("bot", this.t("greeting"));
        }

    }
}

customElements.define('chat-widget', ChatWidget);