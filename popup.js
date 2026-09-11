// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const toggleCheckbox = document.getElementById('hider-toggle'); // 假設 UI 是一個 Toggle Switch

  // 1. 初始化讀取當前儲存狀態並同步 UI
  chrome.storage.local.get({isHiderEnabled: true }, (res) => {
    if (toggleCheckbox) toggleCheckbox.checked = res.isHiderEnabled;
  });

  // 2. 切換開關時更新 Storage 並發送訊息給 active tab
  toggleCheckbox?.addEventListener('change', async (e) => {
    const isEnabled = e.target.checked;

    // 儲存設定，確保跨頁面與刷新後維持狀態
    await chrome.storage.local.set({ isHiderEnabled: isEnabled });

    // 通知當前頁面
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: "SET_STATE", enabled: isEnabled }, (res) => {
        if (chrome.runtime.lastError) {
          console.warn('頁面尚未準備就緒或無 Content Script');
        }
      });
    }
  });
});

