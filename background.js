let extensionStatus = 'on';

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url.startsWith("chrome://")) {
        // Set extension status to 'off' or prevent script injection
        extensionStatus = 'off';
        chrome.action.setIcon({ path: "icons/off.png", tabId: tabId });
    }
});

// Create context menus on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'copySelectedText',
        title: 'Copy',
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        id: 'separator1',
        type: 'separator',
        contexts: ['editable', 'selection']
    });

    chrome.contextMenus.create({
        id: 'pasteClipboard',
        title: 'Paste Clipboard Contents by Swapping',
        contexts: ['editable']
    });

    chrome.contextMenus.create({
        id: 'typeClipboard',
        title: 'Type Clipboard',
        contexts: ['editable']
    });

    chrome.contextMenus.create({
        id: 'separator2',
        type: 'separator',
        contexts: ['editable', 'selection']
    });

    if (extensionStatus === 'on') {
        chrome.contextMenus.create({
            id: 'searchWithOpenAI',
            title: 'Search with OpenAI',
            contexts: ['selection']
        });
        chrome.contextMenus.create({
            id: 'solveMCQ',
            title: 'Solve MCQ',
            contexts: ['selection']
        });
    }
});

// The overlay HTML structure
const overlayHTML = `
<div id="openai-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
    <div style="width: 40%; padding: 20px; background-color: #2c2c2c; border: 1px solid #444; border-radius: 8px;">
        <div id="prompt-suggestions" style="margin-bottom: 10px;">
            <span style="color: #888; cursor: pointer;" onclick="document.getElementById('openai-textbox').value = 'Secret Textbox'">Press [Esc] to exit</span>
        </div>
        <textarea id="openai-textbox" style="width: 100%; height: 100px; padding: 10px 10px; font-size: 16px; background-color: #2c2c2c; color: #ffffff; border: none; border-radius: 8px; resize: vertical; outline: none;"></textarea>
    </div>
</div>
`;

// Function to show the overlay
function showOverlay(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: function(overlayContent) {
            // Check if overlay already exists
            if (document.getElementById('openai-overlay')) {
                document.getElementById('openai-overlay').remove();
                return;
            }

            const overlay = document.createElement('div');
            overlay.innerHTML = overlayContent;
            document.body.appendChild(overlay);

            const textbox = document.getElementById('openai-textbox');
            textbox.focus();

            textbox.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && e.shiftKey) {
                    // Handle the "Search with OpenAI" functionality here
                    // For now, just hide the overlay
                    document.getElementById('openai-overlay').remove();
                }
            });

            // Close overlay on Esc key press
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    document.getElementById('openai-overlay').remove();
                }
            });
        },
        args: [overlayHTML]
    });
}



///////////////////////
//////////////////////

async function checkForUpdate() {
    const response = await fetch('https://tt.sreecha.io/api/version');
    const data = await response.json();
    const repoVersion = data.version;
    const installedVersion = chrome.runtime.getManifest().version;

    if (parseFloat(repoVersion) > parseFloat(installedVersion)) {
        chrome.windows.create({
            url: 'data/update/updatePopup.html',
            type: 'popup',
            width: 100,
            height: 100
        });
        return false; // Version is not valid
    }
    return true; // Version is valid
}


// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const isVersionValid = await checkForUpdate();
    if (!isVersionValid) return;

    if (info.menuItemId === 'copySelectedText' && info.selectionText) {
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: selectedText => {
                const textarea = document.createElement('textarea');
                textarea.textContent = selectedText;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            },
            args: [info.selectionText]
        });
    }

    if (info.menuItemId === 'typeClipboard') {
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: async () => {
                const clipboardText = await navigator.clipboard.readText();
                const activeElement = document.activeElement;
                for (let char of clipboardText) {
                    const keydownEvent = new KeyboardEvent('keydown', {
                        key: char,
                        code: 'Key' + char.toUpperCase(),
                        charCode: char.charCodeAt(0),
                        keyCode: char.charCodeAt(0),
                        which: char.charCodeAt(0),
                        bubbles: true
                    });
                    const keypressEvent = new KeyboardEvent('keypress', {
                        key: char,
                        code: 'Key' + char.toUpperCase(),
                        charCode: char.charCodeAt(0),
                        keyCode: char.charCodeAt(0),
                        which: char.charCodeAt(0),
                        bubbles: true
                    });
                    const inputEvent = new InputEvent('input', {
                        data: char,
                        inputType: 'insertText',
                        bubbles: true
                    });
                    activeElement.dispatchEvent(keydownEvent);
                    activeElement.dispatchEvent(keypressEvent);
                    activeElement.value += char;
                    activeElement.dispatchEvent(inputEvent);
                }
            }
        });
    }

    if (info.menuItemId === 'pasteClipboard') {
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: async () => {
                const clipboardText = await navigator.clipboard.readText();
                document.activeElement.value = clipboardText;
                document.activeElement.dispatchEvent(new Event('input', {bubbles: true}));
            }
        });
    }

    // if (info.menuItemId === 'searchWithOpenAI' && info.selectionText) {
    //     const response = await queryOpenAI(info.selectionText);
    //     if (response) {
    //         copyToClipboard(response);
    //         showToast(tab.id, 'Successful!');
    //     } else {
    //         showToast(tab.id, 'Error. Try again after 30s.',true);
    //     }
    // }

    // if (info.menuItemId === 'solveMCQ' && info.selectionText) {
    //     const response = await queryOpenAI(info.selectionText, true);
    //     if (response) {
    //         showMCQToast(tab.id, response);
    //     } else {
    //         showToast(tab.id, 'Error. Try again.', true);
    //     }
    // }

    if (info.menuItemId === 'searchWithOpenAI' && info.selectionText) {
        const response = await queryOpenAI(info.selectionText);
        handleQueryResponse(response, tab.id);
    }

    if (info.menuItemId === 'solveMCQ' && info.selectionText) {
        const response = await queryOpenAI(info.selectionText, true);
        handleQueryResponse(response, tab.id, true);
    }

});

// Handle the Alt+Shift+K shortcut
chrome.commands.onCommand.addListener(function(command) {
    if (command === 'show-overlay') {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                showOverlay(tabs[0].id);
            }
        });
    }
});


chrome.commands.onCommand.addListener((command, tab) => {
    // Command listener for Alt+Shift+Z/X
    //if (command === 'search-with-openai' || command === 'search-mcq') {
    if (command === 'search-mcq') {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: getSelectedText
        }, async (selection) => {
            if (selection[0]) {
                const isMCQ = command === 'search-mcq';
                const response = await queryOpenAI(selection[0].result, isMCQ);
                handleQueryResponse(response, tab.id, isMCQ);
            }
        });
    }

    // Command listener for Alt+Shift+C (custom copy)
    if (command === 'custom-copy') {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                const selectedText = window.getSelection().toString();
                const textarea = document.createElement('textarea');
                textarea.textContent = selectedText;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
        });
    }

    // Command listener for Alt+Shift+V (custom paste)
    if (command === 'custom-paste') {
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: async () => {
                const clipboardText = await navigator.clipboard.readText();
                document.activeElement.value = clipboardText;
                document.activeElement.dispatchEvent(new Event('input', {bubbles: true}));
            }
        });
    }

    // Command listener for Alt+Shift+H (HELP)
    if (command === 'show-help') {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: showHelpToast
        });
    }
});


// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//     switch (message.command) {
//         case 'show-overlay':
//             showOverlay(sender.tab.id);
//             break;
//         case 'search-with-openai':
//             chrome.scripting.executeScript({
//                 target: { tabId: sender.tab.id },
//                 function: getSelectedText
//             }, async (selection) => {
//                 if (selection[0]) {
//                     const response = await queryOpenAI(selection[0].result);
//                     handleQueryResponse(response, sender.tab.id);
//                 }
//             });
//             break;
//         case 'search-mcq':
//             chrome.scripting.executeScript({
//                 target: { tabId: sender.tab.id },
//                 function: getSelectedText
//             }, async (selection) => {
//                 if (selection[0]) {
//                     const response = await queryOpenAI(selection[0].result, true);
//                     handleQueryResponse(response, sender.tab.id, true);
//                 }
//             });
//             break;
//         case 'custom-copy':
//             chrome.scripting.executeScript({
//                 target: { tabId: sender.tab.id },
//                 function: () => {
//                     const selection = window.getSelection().toString();
//                     if (selection) {
//                         copyToClipboard(selection);
//                     }
//                 }
//             });
//             break;
//         case 'custom-paste':
//             chrome.scripting.executeScript({
//                 target: {tabId: sender.tab.id},
//                 func: async () => {
//                     const clipboardText = await navigator.clipboard.readText();
//                     document.activeElement.value = clipboardText;
//                     document.activeElement.dispatchEvent(new Event('input', {bubbles: true}));
//                 }
//             });
//             break;
//         case 'show-help':
//             showHelpToast(sender.tab.id);
//             break;
//         // Add more cases as needed
//     }
// });


// showHelpToast function
function showHelpToast() {
    const overlayId = 'image-toast-overlay';
    if (document.getElementById(overlayId)) {
        document.getElementById(overlayId).remove();
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.innerHTML = `<img src="https://i.imgur.com/qEQuh64.png" style="width: 255px; height: auto;">`;
    overlay.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999;';

    document.body.appendChild(overlay);

    setTimeout(() => {
        if (document.getElementById(overlayId)) {
            document.getElementById(overlayId).remove();
        }
    }, 5000);

    document.addEventListener('keydown', function onKeyPress(e) {
        if (e.key === 'Escape' && document.getElementById(overlayId)) {
            document.getElementById(overlayId).remove();
            document.removeEventListener('keydown', onKeyPress);
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
            showToast(tabId, 'Successful!');
        }
    } else {
        showToast(tabId, 'Error. Try again after 30s.', true);
    }
}

// Toggle extension functionality on icon click
chrome.action.onClicked.addListener((tab) => {
    if (extensionStatus === 'off') {
        extensionStatus = 'on';

        // Check if content scripts are already injected
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: function() {'!!document.getElementById("lwys-ctv-port")'}
        }, (results) => {
            if (!results || !results[0].result) { // If content scripts are not already injected
                // Create context menus
                chrome.contextMenus.create({
                    id: 'typeClipboard',
                    title: 'Type Clipboard',
                    contexts: ['editable']
                });
                chrome.contextMenus.create({
                    id: 'pasteClipboard',
                    title: 'Paste Clipboard Contents by Swapping',
                    contexts: ['editable']
                });
                chrome.contextMenus.create({
                    id: 'copySelectedText',
                    title: 'Copy',
                    contexts: ['selection']
                });
                if (extensionStatus === 'on') {
                    chrome.contextMenus.create({
                        id: 'searchWithOpenAI',
                        title: 'Search with OpenAI',
                        contexts: ['selection']
                    });
                }

                chrome.action.setIcon({path: 'icons/on.png'});

                // Inject the JavaScript function to force browser default behavior
                chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    func: function() {
                        window.forceBrowserDefault = (e) => {
                            e.stopImmediatePropagation();
                            return true;
                        };
                        ['copy','cut','paste'].forEach(e => document.addEventListener(e, window.forceBrowserDefault, true));
                    }
                });
            }
        });

    } else {
        extensionStatus = 'off';
        chrome.contextMenus.removeAll();
        chrome.action.setIcon({path: 'icons/off.png'});

        // Remove the event listeners to revert to original behavior
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: function() {
                if (typeof forceBrowserDefault !== 'undefined') {
                    ['copy','cut','paste'].forEach(e => document.removeEventListener(e, forceBrowserDefault, true));
                }
            }
        });
    }
});


async function queryOpenAI(text, isMCQ = false) {
    const API_URL = 'https://tt.sreecha.io/api/proxy';
    const API_KEY = 'part-of-nwo-schematics'; 
    if (isMCQ) {
        text += "\nThis is a MCQ question, Just give the option number and the correct answer option alone. No need any explanation. The output should be in this format : <option no.>. <answer option>. If you think the question is ot an mcq, just only say `Not an MCQ`.";
    }
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4-1106-preview',
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: text }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error querying OpenAI:", errorData);
            return null;
        }

        const data = await response.json();
        return data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Exception while querying OpenAI:", error);
        return null;
    }
}

function copyToClipboard(text) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                func: function(content) {
                    const textarea = document.createElement('textarea');
                    textarea.textContent = content;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                },
                args: [text]
            });
        }
    });
}

function showToast(tabId, message, isError = false) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: function(msg, isError) {
            const toast = document.createElement('div');
            toast.textContent = msg;
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.backgroundColor = 'black';
            toast.style.color = isError ? 'red' : 'white';
            toast.style.padding = '10px';
            toast.style.borderRadius = '5px';
            toast.style.zIndex = 1000;

            const closeBtn = document.createElement('span');
            closeBtn.textContent = '‎ ‎ ‎ ◉';
            closeBtn.style.float = 'right';
            closeBtn.style.cursor = 'pointer';
            closeBtn.onclick = function() {
                toast.remove();
            };
            toast.appendChild(closeBtn);

            document.body.appendChild(toast);

            setTimeout(() => {
                toast.remove();
            }, 5000);
        },
        args: [message, isError]
    });
}

function showMCQToast(tabId, message) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: function(msg) {
            // Parse the message to separate option number and answer
            const [optionNumber, ...optionAnswer] = msg.split(' ');
            const formattedMsg = `<b>${optionNumber}</b>‎ ‎ ${optionAnswer.join('‎ ')}`;

            const toast = document.createElement('div');
            toast.innerHTML = formattedMsg; 
            toast.style.position = 'fixed';
            toast.style.bottom = '10px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = 'black';
            toast.style.color = 'white';
            toast.style.padding = '15px';
            toast.style.borderRadius = '5px';
            toast.style.zIndex = 1000;
            toast.style.fontSize = '16px';
            toast.style.textAlign = 'center';
            toast.style.maxWidth = '80%';

            // Add close button
            const closeBtn = document.createElement('span');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.float = 'right';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.marginLeft = '10px';
            closeBtn.onclick = function() {
                toast.remove();
            };
            toast.appendChild(closeBtn);

            document.body.appendChild(toast);

            // Set timeout for auto-dismiss
            setTimeout(() => {
                toast.remove();
            }, 5000);
        },
        args: [message]
    });
}



function showAlert(tabId, message) {
    chrome.scripting.executeScript({
        target: {tabId: tabId},
        func: function(msg) {
            alert(msg);
        },
        args: [message]
    });
}

// Always-active integration starts here

const log = (...args) => chrome.storage.local.get({
  log: false
}, prefs => prefs.log && console.log(...args));

const activate = () => {
  if (activate.busy) {
    return;
  }
  activate.busy = true;

  chrome.storage.local.get({
    enabled: true
  }, async prefs => {
    try {
      await chrome.scripting.unregisterContentScripts();

      if (prefs.enabled) {
        const props = {
          'matches': ['*://*/*'],
          'allFrames': true,
          'matchOriginAsFallback': true,
          'runAt': 'document_start'
        };
        await chrome.scripting.registerContentScripts([{
          ...props,
          'id': 'main',
          'js': ['data/inject/main.js'],
          'world': 'MAIN'
        }, {
          ...props,
          'id': 'isolated',
          'js': ['data/inject/isolated.js'],
          'world': 'ISOLATED'
        }]);
        chrome.action.setIcon({
          path: {
            '48': 'icons/on.png'
          }
        });
      } else {
        chrome.action.setIcon({
          path: {
            '48': 'icons/off.png'
          }
        });
      }
    } catch (e) {
      chrome.action.setBadgeBackgroundColor({color: '#b16464'});
      chrome.action.setBadgeText({text: 'E'});
      chrome.action.setTitle({title: 'Blocker Registration Failed: ' + e.message});
      console.error('Blocker Registration Failed', e);
    }
    activate.busy = false;
  });
};
chrome.runtime.onStartup.addListener(activate);
chrome.runtime.onInstalled.addListener(activate);
chrome.storage.onChanged.addListener(ps => {
  if (ps.enabled) {
    activate();
  }
});

chrome.action.onClicked.addListener(tab => {
  chrome.storage.local.get({
    enabled: true
  }, prefs => {
    chrome.storage.local.set({
      enabled: prefs.enabled === false
    }, () => chrome.tabs.reload(tab.id));
  });
});

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.method === 'check') {
    log('check event from', sender.tab);
  } else if (request.method === 'change') {
    log('page visibility state is changed', sender.tab);
  }
});

