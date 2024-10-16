// content.js

let waiMenu = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openWaiMenu") {
    toggleWaiMenu();
  }
});

function toggleWaiMenu() {
  if (waiMenu) {
    document.body.removeChild(waiMenu);
    waiMenu = null;
  } else {
    createWaiMenu();
  }
}

function createWaiMenu() {
  waiMenu = document.createElement("div");
  waiMenu.id = "wai-menu";
  waiMenu.innerHTML = `
    <div class="wai-menu-container">
      <input type="text" id="wai-menu-input" placeholder="Type a command or search...">
      <div id="wai-menu-options"></div>
    </div>
  `;
  document.body.appendChild(waiMenu);

  const input = waiMenu.querySelector("#wai-menu-input");
  input.focus();
  input.addEventListener("input", handleInput);
  input.addEventListener("keydown", handleKeydown);

  document.addEventListener("click", handleOutsideClick);

  populateOptions(defaultOptions);
}

function handleInput(event) {
  const query = event.target.value.toLowerCase();
  const filteredOptions = defaultOptions.filter(
    (option) =>
      option.name.toLowerCase().includes(query) || option.description.toLowerCase().includes(query)
  );
  populateOptions(filteredOptions);
}

function handleKeydown(event) {
  if (event.key === "Enter") {
    const selectedOption = waiMenu.querySelector(".wai-menu-option.selected");
    if (selectedOption) {
      executeOption(selectedOption.dataset.action);
    }
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    navigateOptions(event.key === "ArrowDown" ? 1 : -1);
  } else if (event.key === "Escape") {
    toggleWaiMenu();
  }
}

function handleOutsideClick(event) {
  if (waiMenu && !waiMenu.contains(event.target)) {
    toggleWaiMenu();
  }
}

function populateOptions(options) {
  const optionsContainer = waiMenu.querySelector("#wai-menu-options");
  optionsContainer.innerHTML = options
    .map(
      (option, index) => `
    <div class="wai-menu-option ${index === 0 ? "selected" : ""}" data-action="${option.action}">
      <div class="wai-menu-option-name">${option.name}</div>
      <div class="wai-menu-option-description">${option.description}</div>
    </div>
  `
    )
    .join("");
}

function navigateOptions(direction) {
  const options = waiMenu.querySelectorAll(".wai-menu-option");
  const currentIndex = Array.from(options).findIndex((option) =>
    option.classList.contains("selected")
  );
  options[currentIndex].classList.remove("selected");
  const newIndex = (currentIndex + direction + options.length) % options.length;
  options[newIndex].classList.add("selected");
  options[newIndex].scrollIntoView({ block: "nearest" });
}

function executeOption(action) {
  const selectedText = window.getSelection().toString();
  chrome.runtime.sendMessage({ action, selectedText });
  toggleWaiMenu();
}

const defaultOptions = [
  { name: "Summarize", action: "summarize", description: "Summarize the selected text" },
  { name: "Translate", action: "translate", description: "Translate the selected text" },
  { name: "Explain", action: "explain", description: "Explain the selected text in simple terms" },
  {
    name: "Find Keywords",
    action: "keywords",
    description: "Extract key words from the selected text",
  },
  {
    name: "Sentiment Analysis",
    action: "sentiment",
    description: "Analyze the sentiment of the selected text",
  },
];

// Inject CSS
const style = document.createElement("style");
style.textContent = `
  #wai-menu {
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    max-width: 90%;
    background-color: #1a1a1a;
    border: 1px solid #333;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    font-family: 'Roboto Mono', monospace;
  }

  .wai-menu-container {
    padding: 10px;
  }

  #wai-menu-input {
    width: 100%;
    padding: 10px;
    border: none;
    background-color: #2a2a2a;
    color: #fff;
    font-size: 16px;
    font-family: 'Roboto Mono', monospace;
  }

  #wai-menu-options {
    max-height: 300px;
    overflow-y: auto;
  }

  .wai-menu-option {
    padding: 10px;
    cursor: pointer;
    border-top: 1px solid #333;
  }

  .wai-menu-option:hover, .wai-menu-option.selected {
    background-color: #2a2a2a;
  }

  .wai-menu-option-name {
    font-weight: bold;
    color: #fff;
  }

  .wai-menu-option-description {
    font-size: 14px;
    color: #aaa;
  }
`;
document.head.appendChild(style);
