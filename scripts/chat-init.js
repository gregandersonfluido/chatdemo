document.addEventListener('DOMContentLoaded', () => {
    fetch('chatdemo/config.json')
        .then(response => response.json())
        .then(config => {
            customElements.whenDefined('chat-widget').then(() => {
                const chatWidget = document.createElement('chat-widget');

                chatWidget.setAttribute('bot-name', config.BOT_NAME);
                chatWidget.setAttribute('logo-url', config.LOGO_URL);
                //TODO: move to an .env file?
                chatWidget.setAttribute('api-url', config.API_URL);
                chatWidget.setAttribute('lang', config.LANG);

                document.body.appendChild(chatWidget);
            }).catch(error => {
                console.error("Error defining ChatWidget:", error);
            });
        })
        .catch(error => {
            console.error("Error loading config.json:", error);
        });
});