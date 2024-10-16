// Initialize context menu items
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "wAI",
    title: "wAI",
    contexts: ["selection"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "wAI") {
    sendMessageToTab(tab.id, { action: "showMenu", text: info.selectionText });
  }
});

// Listen for commands
chrome.commands.onCommand.addListener((command) => {
  if (command === "show-overlay") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendMessageToTab(tabs[0].id, { action: "showMenu" });
      }
    });
  }
});

// Function to send messages to tabs with error handling
function sendMessageToTab(tabId, message) {
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error sending message:", chrome.runtime.lastError.message);
      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          files: ["content.js"],
        },
        () => {
          chrome.tabs.sendMessage(tabId, message);
        }
      );
    }
  });
}

// Function to query AI
async function queryAI(prompt) {
  const { apiKey, endpoint, provider, selectedModel } = await chrome.storage.local.get([
    "apiKey",
    "endpoint",
    "provider",
    "selectedModel",
  ]);

  if (!apiKey || !endpoint) {
    throw new Error("API Key or Endpoint not set. Please complete the onboarding process.");
  }

  let headers = {
    "Content-Type": "application/json",
  };

  let body = {};

  if (provider === "openai") {
    headers["Authorization"] = `Bearer ${apiKey}`;
    body = {
      model: selectedModel || "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    };
  } else if (provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    body = {
      model: selectedModel || "claude-3-sonnet-20240229",
      messages: [{ role: "user", content: prompt }],
    };
  } else {
    // Custom provider
    headers["Authorization"] = `Bearer ${apiKey}`;
    body = {
      model: selectedModel,
      prompt: prompt,
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return provider === "openai" ? data.choices[0].message.content : data.content[0].text;
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "queryAI") {
    queryAI(request.prompt)
      .then((result) => {
        sendResponse({ result: result });
      })
      .catch((error) => {
        console.error("Error querying AI:", error);
        sendResponse({ error: error.message });
      });
    return true; // Indicates we will send a response asynchronously
  }
});
