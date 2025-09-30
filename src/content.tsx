import type { PlasmoCSConfig } from "plasmo"

// Universal Video Translator Content Script
import { textToSpeech } from "./services/text-to-speech"
import { universalVideoAPI } from "./services/universal-video-api"
import { youtubeAPI } from "./services/youtube-api"
import type { ExtensionMessage } from "./types"
import { MESSAGE_TYPES, PATTERNS } from "./utils/constants"
import { storageManager } from "./utils/storage"

export const config: PlasmoCSConfig = {
  matches: [
    "https://www.youtube.com/*",
    "https://www.netflix.com/*",
    "https://vimeo.com/*",
    "https://www.twitch.tv/*",
    "https://www.facebook.com/*",
    "https://www.instagram.com/*",
    "https://www.tiktok.com/*",
    "https://twitter.com/*",
    "https://x.com/*",
    "https://www.bilibili.com/*",
    "https://www.coursera.org/*",
    "https://www.udemy.com/*",
    "https://www.khanacademy.org/*",
    "https://www.hulu.com/*",
    "https://www.disneyplus.com/*",
    "https://www.hbomax.com/*",
    "https://www.amazon.com/*",
    "https://prime.amazon.com/*",
    "https://www.crunchyroll.com/*",
    "https://www.funimation.com/*",
    "https://www.dailymotion.com/*",
    "https://www.ted.com/*",
    "https://www.linkedin.com/*"
  ]
}

// Required for Plasmo content scripts
export {}

class UniversalVideoTranslatorInjector {
  private currentVideoId: string | null = null
  private isActive: boolean = false
  private platform: string = "Unknown"

  constructor() {
    this.platform = this.detectPlatform()
    this.init()
  }

  private detectPlatform(): string {
    const hostname = window.location.hostname

    if (hostname.includes("youtube.com")) return "YouTube"
    if (hostname.includes("netflix.com")) return "Netflix"
    if (hostname.includes("vimeo.com")) return "Vimeo"
    if (hostname.includes("tiktok.com")) return "TikTok"
    if (hostname.includes("facebook.com")) return "Facebook"
    if (hostname.includes("twitter.com") || hostname.includes("x.com"))
      return "Twitter"
    if (hostname.includes("bilibili.com")) return "Bilibili"
    if (hostname.includes("coursera.org")) return "Coursera"
    if (hostname.includes("twitch.tv")) return "Twitch"

    return `Generic (${hostname})`
  }

  private async init() {
    // Kiểm tra extension có được enable không
    const isEnabled = await storageManager.getIsEnabled()
    if (!isEnabled) {
      return
    }

    // Setup message listener
    this.setupMessageListener()

    // Setup URL change listener
    this.setupURLChangeListener()

    // Inject nếu đang ở video page
    if (this.isVideoPage()) {
      this.onVideoPageLoad()
    }

    console.log(`${this.platform} Translator injected successfully`)
  }

  private isVideoPage(): boolean {
    // Universal video page detection
    const video = document.querySelector("video")
    const hasVideo = video !== null

    // Platform-specific checks
    if (this.platform === "YouTube") {
      return window.location.pathname === "/watch"
    }

    // Generic: có video element là video page
    return hasVideo
  }

  private getCurrentVideoId(): string | null {
    // Sử dụng universal API để lấy video info
    const platform = universalVideoAPI.detectPlatform()
    if (platform) {
      return platform.extractVideoId(window.location.href)
    }

    // Fallback: YouTube pattern
    const url = window.location.href
    const match = url.match(PATTERNS.YOUTUBE_VIDEO_ID)
    return match ? match[1] : null
  }

  private setupURLChangeListener() {
    let lastUrl = location.href
    new MutationObserver(() => {
      const url = location.href
      if (url !== lastUrl) {
        lastUrl = url
        this.onURLChanged()
      }
    }).observe(document, { subtree: true, childList: true })
  }

  private onURLChanged() {
    if (this.isVideoPage()) {
      const videoId = this.getCurrentVideoId()
      if (videoId !== this.currentVideoId) {
        this.currentVideoId = videoId
        this.onVideoPageLoad()
      }
    }
  }

  private onVideoPageLoad() {
    console.log("Video page loaded:", this.currentVideoId)
    // Có thể thêm logic khởi tạo ở đây
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener(
      (message: ExtensionMessage, _sender, sendResponse) => {
        switch (message.type) {
          case MESSAGE_TYPES.TOGGLE_TRANSLATOR:
            this.toggleTranslator()
            sendResponse({ success: true, isActive: this.isActive })
            break

          case MESSAGE_TYPES.GET_VIDEO_INFO:
            const videoId = this.getCurrentVideoId()
            sendResponse({
              videoId,
              isVideoPage: this.isVideoPage(),
              isActive: this.isActive
            })
            break

          case "PING" as any:
            sendResponse({ success: true })
            break

          default:
            sendResponse({ success: false, error: "Unknown message type" })
        }
      }
    )
  }

  private toggleTranslator() {
    this.isActive = !this.isActive
    console.log("Translator toggled:", this.isActive)

    if (this.isActive) {
      this.startTranslation()
    } else {
      this.stopTranslation()
    }
  }

  private async startTranslation() {
    console.log("Starting translation...")
    // Logic để bắt đầu dịch thuật sẽ được implement ở đây
  }

  private stopTranslation() {
    console.log("Stopping translation...")
    textToSpeech.stop()
  }
}

// Initialize injector
new UniversalVideoTranslatorInjector()
