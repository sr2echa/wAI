document.addEventListener("DOMContentLoaded", function () {
  const onboarding = document.getElementById("onboarding");
  const dashboard = document.getElementById("dashboard");
  const provider = document.getElementById("provider");
  const apiKey = document.getElementById("apiKey");
  const customEndpoint = document.getElementById("customEndpoint");
  const nextStep = document.getElementById("nextStep");
  const clearApiKey = document.getElementById("clearApiKey");
  const reset = document.getElementById("reset");
  const fetchModels = document.getElementById("fetchModels");
  const modelsList = document.getElementById("modelsList");
  const selectedModel = document.getElementById("selectedModel");
  const selectedModelLabel = document.querySelector('label[for="selectedModel"]');
  const darkModeToggle = document.getElementById("darkModeToggle");
  const autoFetchToggle = document.getElementById("autoFetchToggle");
  const updateApiKey = document.getElementById("updateApiKey");
  const updateApiKeyModal = document.getElementById("updateApiKeyModal");
  const closeModal = document.querySelector(".close");
  const confirmUpdateApiKey = document.getElementById("confirmUpdateApiKey");
  const newApiKey = document.getElementById("newApiKey");

  let currentStep = 1;
  const stepDots = document.querySelectorAll(".step-dot");

  function showOnboarding() {
    onboarding.style.display = "flex";
    dashboard.style.display = "none";
    currentStep = 1;
    updateStepIndicator();
    showCurrentStep();
    updateNextStepButtonState();
  }

  function showDashboard() {
    onboarding.style.display = "none";
    dashboard.style.display = "flex";
    updateSelectedModelField();
    if (localStorage.getItem("autoFetch") === "true") {
      fetchAvailableModels();
    }
  }

  function updateSelectedModelField() {
    const provider = localStorage.getItem("provider");
    if (provider === "custom") {
      selectedModel.readOnly = false;
      selectedModelLabel.textContent = "Custom Model Name";
      selectedModel.placeholder = "Enter custom model name";
    } else {
      selectedModel.readOnly = true;
      selectedModelLabel.textContent = "Selected Model";
      selectedModel.placeholder = "";
    }
  }

  function updateStepIndicator() {
    stepDots.forEach((dot, index) => {
      dot.classList.toggle("active", index < currentStep);
    });
  }

  function showCurrentStep() {
    document.getElementById(`step${currentStep}`).style.display = "block";
    for (let i = 1; i <= 3; i++) {
      if (i !== currentStep) {
        document.getElementById(`step${i}`).style.display = "none";
      }
    }
  }

  function updateNextStepButtonState() {
    if (currentStep === 1) {
      nextStep.disabled = !provider.value;
    } else if (currentStep === 2) {
      nextStep.disabled = !apiKey.value;
    } else if (currentStep === 3) {
      nextStep.disabled = !customEndpoint.value;
    }
  }

  function handleNextStep() {
    if (currentStep === 1 && provider.value) {
      chrome.storage.local.set({ provider: provider.value });
      if (provider.value === "openai") {
        chrome.storage.local.set({ endpoint: "https://api.openai.com/v1/chat/completions" });
      } else if (provider.value === "anthropic") {
        chrome.storage.local.set({ endpoint: "https://api.anthropic.com/v1/messages" });
      }
      currentStep++;
    } else if (currentStep === 2 && apiKey.value) {
      chrome.storage.local.set({ apiKey: apiKey.value });
      if (provider.value === "custom") {
        currentStep++;
      } else {
        showDashboard();
        return;
      }
    } else if (currentStep === 3 && customEndpoint.value) {
      chrome.storage.local.set({ endpoint: customEndpoint.value });
      showDashboard();
      return;
    }
    updateStepIndicator();
    showCurrentStep();
    updateNextStepButtonState();
  }

  function clearApiKeyHandler() {
    chrome.storage.local.remove("apiKey");
    alert("API Key cleared");
  }

  function resetHandler() {
    chrome.storage.local.clear();
    showOnboarding();
  }

  async function fetchAvailableModels() {
    const { apiKey, provider, endpoint } = await chrome.storage.local.get([
      "apiKey",
      "provider",
      "endpoint",
    ]);

    if (!apiKey || !provider || !endpoint) {
      alert("API Key, Provider, or Endpoint not set. Please complete the onboarding process.");
      return;
    }

    modelsList.innerHTML = "Fetching models...";

    try {
      let models;
      if (provider === "openai") {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const data = await response.json();
        models = data.data.map((model) => model.id);
      } else if (provider === "anthropic") {
        models = [
          "claude-3-5-sonnet-20240620",
          "claude-3-opus-20240229",
          "claude-3-sonnet-20240229",
          "claude-3-haiku-20240307",
        ];
      } else if (provider === "custom") {
        models = [selectedModel.value];
      } else {
        throw new Error("Unsupported provider");
      }

      modelsList.innerHTML = "";
      models.forEach((model) => {
        const modelItem = document.createElement("div");
        modelItem.classList.add("model-item");
        modelItem.textContent = model;
        modelItem.onclick = () => selectModel(model);
        modelsList.appendChild(modelItem);
      });

      chrome.storage.local.set({ availableModels: models });
    } catch (error) {
      modelsList.innerHTML = "Error fetching models. Please try again.";
      console.error("Error fetching models:", error);
    }
  }

  function selectModel(modelName) {
    chrome.storage.local.set({ selectedModel: modelName });
    selectedModel.value = modelName;
  }

  function toggleDarkMode() {
    document.body.classList.toggle("light-mode");
    chrome.storage.local.set({ darkMode: darkModeToggle.checked });
  }

  function toggleAutoFetch() {
    chrome.storage.local.set({ autoFetch: autoFetchToggle.checked });
  }

  // Event Listeners
  if (nextStep) nextStep.addEventListener("click", handleNextStep);
  if (clearApiKey) clearApiKey.addEventListener("click", clearApiKeyHandler);
  if (reset) reset.addEventListener("click", resetHandler);
  if (fetchModels) fetchModels.addEventListener("click", fetchAvailableModels);
  if (darkModeToggle) darkModeToggle.addEventListener("change", toggleDarkMode);
  if (autoFetchToggle) autoFetchToggle.addEventListener("change", toggleAutoFetch);
  if (updateApiKey) updateApiKey.addEventListener("click", showUpdateApiKeyModal);
  if (closeModal) closeModal.addEventListener("click", hideUpdateApiKeyModal);
  if (confirmUpdateApiKey) confirmUpdateApiKey.addEventListener("click", handleUpdateApiKey);
  if (selectedModel)
    selectedModel.addEventListener("change", function () {
      if (localStorage.getItem("provider") === "custom") {
        localStorage.setItem("selectedModel", this.value);
      }
    });

  // Input event listeners for updating button states
  if (provider) provider.addEventListener("input", updateNextStepButtonState);
  if (apiKey) apiKey.addEventListener("input", updateNextStepButtonState);
  if (customEndpoint) customEndpoint.addEventListener("input", updateNextStepButtonState);

  // Close the modal if the user clicks outside of it
  window.addEventListener("click", (event) => {
    if (event.target === updateApiKeyModal) {
      hideUpdateApiKeyModal();
    }
  });

  // Initialization
  chrome.storage.local.get(["provider", "apiKey", "endpoint"], (result) => {
    if (result.provider && result.apiKey && result.endpoint) {
      showDashboard();
    } else {
      showOnboarding();
    }
  });

  chrome.storage.local.get(
    ["selectedModel", "darkMode", "autoFetch", "availableModels"],
    (result) => {
      if (selectedModel) selectedModel.value = result.selectedModel || "";
      if (darkModeToggle) darkModeToggle.checked = result.darkMode !== false;
      if (autoFetchToggle) autoFetchToggle.checked = result.autoFetch === true;
      toggleDarkMode();

      if (result.availableModels && modelsList) {
        modelsList.innerHTML = "";
        result.availableModels.forEach((model) => {
          const modelItem = document.createElement("div");
          modelItem.classList.add("model-item");
          modelItem.textContent = model;
          modelItem.onclick = () => selectModel(model);
          modelsList.appendChild(modelItem);
        });
      }
    }
  );

  // Initialization
  updateNextStepButtonState();
});

function showUpdateApiKeyModal() {
  updateApiKeyModal.style.display = "block";
  confirmUpdateApiKey.disabled = true;
  newApiKey.addEventListener("input", function () {
    confirmUpdateApiKey.disabled = !this.value.trim();
  });
}

function hideUpdateApiKeyModal() {
  updateApiKeyModal.style.display = "none";
  newApiKey.value = "";
}

function handleUpdateApiKey() {
  const apiKeyValue = newApiKey.value.trim();
  if (apiKeyValue) {
    chrome.storage.local.set({ apiKey: apiKeyValue });
    alert("API Key updated successfully");
    hideUpdateApiKeyModal();
  }
}
