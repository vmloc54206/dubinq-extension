// Background Script cho YouTube Translator Extension
export {}

console.log("YouTube Translator background service initialized")

// Setup message listeners
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message)

  // Handle different message types
  switch (message.type) {
    case "GET_VIDEO_INFO":
      handleGetVideoInfo(sender, sendResponse)
      break
    case "TOGGLE_TRANSLATOR":
      handleToggleTranslator(sender, sendResponse)
      break
    default:
      sendResponse({ success: false, error: "Unknown message type" })
  }

  return true // Keep message channel open for async response
})

async function handleGetVideoInfo(
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void
) {
  if (!sender.tab?.id) {
    sendResponse({ success: false, error: "No tab ID" })
    return
  }

  try {
    sendResponse({
      success: true,
      data: { videoId: "test", title: "Test Video" }
    })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleToggleTranslator(
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void
) {
  if (!sender.tab?.id) {
    sendResponse({ success: false, error: "No tab ID" })
    return
  }

  try {
    sendResponse({ success: true, data: { enabled: true } })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
}
