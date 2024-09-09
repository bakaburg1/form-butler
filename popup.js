document.addEventListener('DOMContentLoaded', () => {
  const fillFormBtn = document.getElementById('fill-form-btn');
  const autoFillCheckbox = document.getElementById('auto-fill-checkbox');

  fillFormBtn.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "fillForm"});
    });
  });

  autoFillCheckbox.addEventListener('change', (event) => {
    chrome.storage.sync.set({autoFill: event.target.checked});
  });

  // Load saved auto-fill preference
  chrome.storage.sync.get('autoFill', (data) => {
    autoFillCheckbox.checked = data.autoFill || false;
  });
});
