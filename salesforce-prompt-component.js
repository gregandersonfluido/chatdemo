// salesforce-prompt-component.js

/**
 * Define a custom web component <salesforce-prompt>
 * that floats on the page as a widget for users to ask questions.
 * It includes a lock icon, header, input field, a loading indicator,
 * and a modal window with a header and vertical scroll if content is long.
 */
class SalesforcePromptComponent extends HTMLElement {
  constructor() {
    super();
    // Create a shadow DOM for encapsulation.
    this.attachShadow({ mode: "open" });

    // Set up the HTML template.
    this.shadowRoot.innerHTML = `
      <style>
        /* Floating widget container */
        #floatingContainer {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #fff;
          border: 1px solid #ccc;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          width: 300px;
          font-family: Arial, sans-serif;
          z-index: 1000;
        }
        /* Header with lock icon */
        #header {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        #header img {
          width: 20px;
          height: 20px;
          margin-right: 8px;
        }
        #header h2 {
          font-size: 1.2em;
          margin: 0;
          color: #003366;
        }
        /* Input container */
        #questionContainer {
          display: flex;
          flex-direction: column;
        }
        #questionInput {
          padding: 8px;
          font-size: 1em;
          margin-bottom: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        #questionInput:disabled {
          background-color: #f0f0f0;
          color: #888;
        }
        #askButton {
          padding: 8px;
          font-size: 1em;
          background: #003366;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        #askButton:disabled {
          background: #aaa;
          cursor: not-allowed;
        }
        #loadingIndicator {
          display: none;
          margin-top: 10px;
          font-size: 0.9em;
          color: #003366;
        }
        /* Modal overlay */
        #myModal {
          display: none;
          position: fixed;
          z-index: 1001;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.4);
        }
        /* Modal content container */
        #modalContent {
          background-color: #fefefe;
          margin: 5% auto;
          width: 80%;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          border: 1px solid #888;
          border-radius: 8px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        /* Modal header */
        #modalHeader {
          background: #003366;
          color: #fff;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        #modalHeader h3 {
          margin: 0;
          font-size: 1.2em;
        }
        #closeModal {
          font-size: 1.5em;
          cursor: pointer;
        }
        /* Modal body with vertical scrolling */
        #modalBody {
          padding: 20px;
          overflow-y: auto;
        }
      </style>

      <div id="floatingContainer">
        <div id="header">
          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0OC40IDQ4LjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8cGF0aCBmaWxsPSIjMDAzMzY2IiBkPSJNMjQuMiA0OC40QzM2LjkgNDguNCA0OC40IDM2LjkgNDguNCAyNC4yUzM2LjkgMCAyNC4yIDBTMCAxMS41IDAgMjQuMUMwIDM2LjkgMTEuNSA0OC40IDI0LjIgNDguNCIvPgogICAgPHBhdGggZmlsbD0iI2ZmZiIgZD0iTTI0LjIgMTAuMUMxOC41IDExLjEgMTQuMiAxNC41IDE0LjIgMTkuMkMxNC4yIDI0LjkgMTguNSAyOC4zIDI0LjIgMjguM0MyOS45IDI4LjMgMzQuMiAyNC45IDM0LjIgMTkuMkMzNC4yIDE0LjUgMzAuOSAxMS4xIDI0LjIgMTAuMXoiLz4KPC9zdmc+" alt="lock icon" />
          <h2>Ask me a question</h2>
        </div>
        <div id="questionContainer">
          <input type="text" id="questionInput" placeholder="Type your question here" />
          <button id="askButton">Ask</button>
          <div id="loadingIndicator">Request in progress...</div>
        </div>
      </div>

      <!-- Modal Window -->
      <div id="myModal">
        <div id="modalContent">
          <div id="modalHeader">
            <h3>Answer</h3>
            <span id="closeModal">&times;</span>
          </div>
          <div id="modalBody">
            <div id="modalText">Answer will appear here...</div>
          </div>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    // Add event listener to the Ask button.
    this.shadowRoot
      .getElementById("askButton")
      .addEventListener("click", () => this.askQuestion());

    // Add event listener to the Close button in the modal header.
    this.shadowRoot
      .getElementById("closeModal")
      .addEventListener("click", () => this.closeModal());

    // Close the modal when clicking outside the modal content.
    this.shadowRoot
      .getElementById("myModal")
      .addEventListener("click", (event) => {
        if (event.target === this.shadowRoot.getElementById("myModal")) {
          this.closeModal();
        }
      });
  }

  async askQuestion() {
    const input = this.shadowRoot.getElementById("questionInput");
    const button = this.shadowRoot.getElementById("askButton");
    const loading = this.shadowRoot.getElementById("loadingIndicator");

    const question = input.value;
    if (!question) {
      alert("Please enter a question.");
      return;
    }

    // Disable input and button; show loading.
    input.disabled = true;
    button.disabled = true;
    loading.style.display = "block";

    try {
      // Call your Cloud Function endpoint.
      const response = await fetch(
        "https://europe-north1-febcdogcp.cloudfunctions.net/Chat-Proxy2",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question }),
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      this.openModal(data.answer || "No answer received.");
    } catch (error) {
      console.error("Error calling proxy API:", error);
      this.openModal("Error retrieving answer. Please try again later.");
    } finally {
      // Re-enable input and button; hide loading.
      input.disabled = false;
      button.disabled = false;
      loading.style.display = "none";
    }
  }

  /**
   * Helper method to decode HTML entities.
   */
  decodeHtmlEntities(htmlString) {
    const txt = document.createElement("textarea");
    txt.innerHTML = htmlString;
    return txt.value;
  }

  /**
   * Opens the modal and displays the unescaped HTML answer.
   * @param {string} escapedHtml - The HTML answer (escaped) to display.
   */
  openModal(escapedHtml) {
    const modal = this.shadowRoot.getElementById("myModal");
    const modalText = this.shadowRoot.getElementById("modalText");

    // Decode any escaped HTML entities.
    const decodedHtml = this.decodeHtmlEntities(escapedHtml);
    modalText.innerHTML = decodedHtml;
    modal.style.display = "block";
  }

  /**
   * Closes the modal.
   */
  closeModal() {
    const modal = this.shadowRoot.getElementById("myModal");
    modal.style.display = "none";
  }
}

customElements.define("salesforce-prompt", SalesforcePromptComponent);
