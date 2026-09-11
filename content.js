// 輔助函式：建立並定位彈窗
function showPopupNearElement(targetElement, message) {
    const popup = document.createElement('div')
    popup.textContent = message
    Object.assign(popup.style, {
                                position: 'absolute',
                                backgroundColor: '#333',
                                color: '#fff',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                zIndex: '9999',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                pointerEvents: 'auto'
                              })

    document.body.appendChild(popup)
    const rect = targetElement.getBoundingClientRect()
    const top  = rect.bottom + window.scrollY + 4
    const left = rect.left + window.scrollX
    popup.style.top  = `${top}px`
    popup.style.left = `${left}px`
}



function hideElements(selector, options = {}) {
  // 預設的開關配置（可透過 options 自訂傳入，預設全部開啟或依需求調整）
  const config = {
                  disableLink: options.disableLink ?? true,       // 移除 href 連結
                  changeColor: options.changeColor ?? true,       // 改變文字顏色
                  changeBg: options.changeBg ?? true,             // 改變背景色
                  changeFontSize: options.changeFontSize ?? true, // 改變字型大小
                  opacity: options.opacity ?? 1,                  // 透明度 (設為 false 則不套用)
                  display: options.display ?? null,               // 'none' 或 'block' 或 null
                  visibility: options.visibility ?? null,         // 'hidden' 或 'visible' 或 null
                  cursor: options.cursor ?? 'not-allowed',        // 游標樣式 ('pointer', 'not-allowed', 'default', etc.)
                  pointerEvents: options.pointerEvents ?? 'none', // 'none' 或 'auto'
                  showPopup: options.showPopup ?? true,           // 是否顯示彈窗
                  popupMessage: options.popupMessage ?? '此項目（Web APIs）目前無法使用',
                  ...options
                }

  const links = document.querySelectorAll(selector)
  links.forEach(link => {
    const text = link.querySelector('span[property="name"]')

    if (text?.textContent.trim() === 'Web APIs') {
      console.log('找到 Web APIs：', link)

      // 1. 連結屬性控制
      if (config.disableLink) {
        link.removeAttribute('href')
      } else {
        // 如果需要保留或恢復，可以自行設定
      }


      // 2. 樣式與外觀控制
      if (config.changeColor) {
        link.style.color = typeof config.changeColor === 'string' ? config.changeColor : 'red'
      } else {
        link.style.removeProperty('color')
      }

      if (config.changeBg) {
        link.style.backgroundColor = typeof config.changeBg === 'string' ? config.changeBg : '#f0f0f0'
      } else {
        link.style.removeProperty('background-color')
      }

      if (config.changeFontSize) {
        link.style.fontSize = typeof config.changeFontSize === 'string' ? config.changeFontSize : '16px' 
      } else {
        link.style.removeProperty('font-size')
      }

      if (config.opacity !== false) {
        link.style.opacity = config.opacity
      } else {
        link.style.removeProperty('opacity')
      }

      if (config.display) {
        link.style.display = config.display
      } else {
        link.style.removeProperty('display')
      }

      if (config.visibility) {
        link.style.visibility = config.visibility
      } else {
        link.style.removeProperty('visibility')
      }

      // 3. 互動與游標控制
      if (config.cursor) {
        link.style.cursor = config.cursor
      } else {
        link.style.removeProperty('cursor')
      }

      if (config.pointerEvents) {
        link.style.pointerEvents = config.pointerEvents
      } else {
        link.style.removeProperty('pointer-events')
      }

      // 4. 彈窗控制
      if (config.showPopup) {
        showPopupNearElement(link, config.popupMessage)
      }
    }
  })
}



// Example 1：使用預設值（全部開啟）
// Base_Url = 'https://developer.mozilla.org/en-US/docs/Web/API?utm_source=chatgpt.com'
hideElements('a');


// Example 2：自訂開關（例如：保留超連結、不要透明度、改成藍色字、不顯示彈窗）
// hideElements('a', {
//   disableLink: false,
//   changeColor: 'blue',
//   opacity: false,
//   showPopup: false
// });


// Example 3：隱藏元素（display: none）並關閉彈窗
// hideElements('a', {
//   display: 'none',
//   showPopup: false
// });

