// background.js

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "show-overlay") {
    chrome.tabs.sendMessage(tab.id, { action: "openWaiMenu" });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (
    request.action === "summarize" ||
    request.action === "translate" ||
    request.action === "explain" ||
    request.action === "keywords" ||
    request.action === "sentiment"
  ) {
    handleAIRequest(request.action, request.selectedText, sender.tab.id);
  }
});

async function handleAIRequest(action, text, tabId) {
  const prompt = getPromptForAction(action, text);
  const response = await queryOpenAI(prompt);
  if (response) {
    showToast(tabId, response);
  } else {
    showToast(tabId, "Error processing request. Please try again.", true);
  }
}

function getPromptForAction(action, text) {
  switch (action) {
    case "summarize":
      return `Summarize the following text:\n\n${text}`;
    case "translate":
      return `Translate the following text to English:\n\n${text}`;
    case "explain":
      return `Explain the following text in simple terms:\n\n${text}`;
    case "keywords":
      return `Extract key words from the following text:\n\n${text}`;
    case "sentiment":
      return `Analyze the sentiment of the following text:\n\n${text}`;
    default:
      return text;
  }
}

// Keep your existing queryOpenAI and showToast functions here
// Handle the Alt+Shift+K shortcut
chrome.commands.onCommand.addListener(function (command) {
  if (command === "show-overlay") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        showOverlay(tabs[0].id);
      }
    });
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  // Command listener for Alt+Shift+Z/X
  //if (command === 'search-with-openai' || command === 'search-mcq') {
  if (command === "search-mcq") {
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        function: getSelectedText,
      },
      async (selection) => {
        if (selection[0]) {
          const isMCQ = command === "search-mcq";
          const response = await queryOpenAI(selection[0].result, isMCQ);
          handleQueryResponse(response, tab.id, isMCQ);
        }
      }
    );
  }

  // Command listener for Alt+Shift+C (custom copy)
  if (command === "custom-copy") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const selectedText = window.getSelection().toString();
        const textarea = document.createElement("textarea");
        textarea.textContent = selectedText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      },
    });
  }

  // Command listener for Alt+Shift+V (custom paste)
  if (command === "custom-paste") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        const clipboardText = await navigator.clipboard.readText();
        document.activeElement.value = clipboardText;
        document.activeElement.dispatchEvent(new Event("input", { bubbles: true }));
      },
    });
  }

  // Command listener for Alt+Shift+H (HELP)
  if (command === "show-help") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: showHelpToast,
    });
  }
});

// showHelpToast function
function showHelpToast() {
  const overlayId = "image-toast-overlay";
  if (document.getElementById(overlayId)) {
    document.getElementById(overlayId).remove();
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = overlayId;
  overlay.innerHTML = `<img src="https://i.imgur.com/qEQuh64.png" style="width: 255px; height: auto;">`;
  overlay.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 9999;";

  document.body.appendChild(overlay);

  setTimeout(() => {
    if (document.getElementById(overlayId)) {
      document.getElementById(overlayId).remove();
    }
  }, 5000);

  document.addEventListener("keydown", function onKeyPress(e) {
    if (e.key === "Escape" && document.getElementById(overlayId)) {
      document.getElementById(overlayId).remove();
      document.removeEventListener("keydown", onKeyPress);
    }
  });
}

// Function to get the selected text in the current tab
function getSelectedText() {
  return window.getSelection().toString();
}

// Function to handle the response from queryOpenAI
function handleQueryResponse(response, tabId, isMCQ = false) {
  if (response) {
    if (isMCQ) {
      showMCQToast(tabId, response);
    } else {
      copyToClipboard(response);
      showToast(tabId, "Successful!");
    }
  } else {
    showToast(tabId, "Error. Try again after 30s.", true);
  }
}

async function queryOpenAI(text, isMCQ = false) {
  const API_URL = localStorage.getItem("endpoint") || "";
  const API_KEY = localStorage.getItem("apiKey") || "";
  if (isMCQ) {
    text +=
      "\nThis is a MCQ question, Just give the option number and the correct answer option alone. No need any explanation. The output should be in this format : <option no.>. <answer option>. If you think the question is ot an mcq, just only say `Not an MCQ`.";
  }
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4-1106-preview",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error querying OpenAI:", errorData);
      return null;
    }

    const data = await response.json();
    return (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content.trim()
    );
  } catch (error) {
    console.error("Exception while querying OpenAI:", error);
    return null;
  }
}

function copyToClipboard(text) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0]) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: function (content) {
          const textarea = document.createElement("textarea");
          textarea.textContent = content;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        },
        args: [text],
      });
    }
  });
}

function showToast(tabId, message, isError = false) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: function (msg, isError) {
      const toast = document.createElement("div");
      toast.textContent = msg;
      toast.style.position = "fixed";
      toast.style.bottom = "20px";
      toast.style.right = "20px";
      toast.style.backgroundColor = "black";
      toast.style.color = isError ? "red" : "white";
      toast.style.padding = "10px";
      toast.style.borderRadius = "5px";
      toast.style.zIndex = 1000;

      const closeBtn = document.createElement("span");
      closeBtn.textContent = "‎ ‎ ‎ ◉";
      closeBtn.style.float = "right";
      closeBtn.style.cursor = "pointer";
      closeBtn.onclick = function () {
        toast.remove();
      };
      toast.appendChild(closeBtn);

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 5000);
    },
    args: [message, isError],
  });
}

function showMCQToast(tabId, message) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: function (msg) {
      // Parse the message to separate option number and answer
      const [optionNumber, ...optionAnswer] = msg.split(" ");
      const formattedMsg = `<b>${optionNumber}</b>‎ ‎ ${optionAnswer.join("‎ ")}`;

      const toast = document.createElement("div");
      toast.innerHTML = formattedMsg;
      toast.style.position = "fixed";
      toast.style.bottom = "10px";
      toast.style.left = "50%";
      toast.style.transform = "translateX(-50%)";
      toast.style.backgroundColor = "black";
      toast.style.color = "white";
      toast.style.padding = "15px";
      toast.style.borderRadius = "5px";
      toast.style.zIndex = 1000;
      toast.style.fontSize = "16px";
      toast.style.textAlign = "center";
      toast.style.maxWidth = "80%";

      // Add close button
      const closeBtn = document.createElement("span");
      closeBtn.innerHTML = "&times;";
      closeBtn.style.float = "right";
      closeBtn.style.cursor = "pointer";
      closeBtn.style.marginLeft = "10px";
      closeBtn.onclick = function () {
        toast.remove();
      };
      toast.appendChild(closeBtn);

      document.body.appendChild(toast);

      // Set timeout for auto-dismiss
      setTimeout(() => {
        toast.remove();
      }, 5000);
    },
    args: [message],
  });
}

function showAlert(tabId, message) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: function (msg) {
      alert(msg);
    },
    args: [message],
  });
}
