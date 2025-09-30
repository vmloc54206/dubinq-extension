// YouTube API Service để lấy subtitle và thông tin video

import type { SubtitleEntry, VideoInfo, YouTubeCaption } from "../types"
import { API_ENDPOINTS, PATTERNS } from "../utils/constants"

class YouTubeAPIService {
  private apiKey: string = ""

  constructor() {
    // Load API key từ Plasmo environment
    this.apiKey = process.env.PLASMO_PUBLIC_YOUTUBE_API_KEY || ""

    if (this.apiKey) {
      console.log("✅ YouTube API key loaded from environment")
    } else {
      console.warn("⚠️ YouTube API key not found in environment")
    }
  }

  // Set API key
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
    console.log("✅ YouTube API key set manually")
  }

  // Lấy video ID từ URL
  extractVideoId(url: string): string | null {
    const match = url.match(PATTERNS.YOUTUBE_VIDEO_ID)
    return match ? match[1] : null
  }

  // Lấy thông tin video từ YouTube API
  async getVideoInfo(videoId: string): Promise<VideoInfo | null> {
    try {
      if (!this.apiKey) {
        console.warn("YouTube API key not set")
        return this.getVideoInfoFromDOM(videoId)
      }

      const response = await fetch(
        `${API_ENDPOINTS.YOUTUBE_VIDEOS}?part=snippet,contentDetails&id=${videoId}&key=${this.apiKey}`
      )

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()

      if (!data.items || data.items.length === 0) {
        return null
      }

      const video = data.items[0]
      const duration = this.parseDuration(video.contentDetails.duration)

      // Lấy danh sách captions
      const captions = await this.getVideoCaptions(videoId)

      return {
        videoId,
        title: video.snippet.title,
        duration,
        hasSubtitles: captions.length > 0,
        availableLanguages: captions.map((cap) => cap.languageCode)
      }
    } catch (error) {
      console.error("Error getting video info:", error)
      return this.getVideoInfoFromDOM(videoId)
    }
  }

  // Fallback: lấy thông tin video từ DOM
  private getVideoInfoFromDOM(videoId: string): VideoInfo {
    console.log("🔍 YouTube DOM: Extracting video info for:", videoId)

    // Enhanced title selectors with NEW YouTube layout
    const titleSelectors = [
      // NEW YouTube layout (2024)
      "h1.ytd-watch-metadata yt-formatted-string",
      "yt-formatted-string.ytd-watch-metadata",
      "#title yt-formatted-string",
      // OLD YouTube layout
      "h1.ytd-video-primary-info-renderer",
      "h1.style-scope.ytd-video-primary-info-renderer",
      "#title h1",
      ".ytd-video-primary-info-renderer h1",
      // Generic
      'h1[class*="title"]',
      "h1.title",
      // Player
      ".ytp-title-link",
      ".ytp-title",
      // Meta tags (last resort)
      'meta[property="og:title"]',
      'meta[name="title"]'
    ]

    let title = "Unknown Title"
    for (const selector of titleSelectors) {
      try {
        const element = document.querySelector(selector)
        if (element) {
          // Check meta tag
          if (selector.includes("meta")) {
            const metaElement = element as HTMLMetaElement
            if (metaElement?.content?.trim()) {
              title = metaElement.content.trim()
              console.log(`✅ Found title from meta: "${title}"`)
              break
            }
          } else {
            // Regular element
            const text = element.textContent?.trim()
            if (text && text !== "Unknown Title" && text.length > 0) {
              title = text
              console.log(`✅ Found title: "${title}" using: ${selector}`)
              break
            }
          }
        }
      } catch (error) {
        // Ignore errors, try next selector
      }
    }

    const videoElement = document.querySelector("video") as HTMLVideoElement
    const hasSubtitles = this.checkSubtitlesFromDOM()

    console.log("✅ YouTube DOM extraction:", {
      videoId,
      title,
      duration: videoElement?.duration || 0,
      hasSubtitles
    })

    return {
      videoId,
      title,
      duration: videoElement?.duration || 0,
      hasSubtitles,
      availableLanguages: this.getAvailableLanguagesFromDOM()
    }
  }

  // Enhanced subtitle detection
  private checkSubtitlesFromDOM(): boolean {
    console.log("🔍 YouTube: Enhanced subtitle check")

    // Method 1: Check subtitle/caption buttons (most reliable)
    const subtitleSelectors = [
      ".ytp-subtitles-button",
      ".ytp-caption-button",
      'button[aria-label*="Subtitles"]',
      'button[aria-label*="subtitles"]',
      'button[aria-label*="Captions"]',
      'button[aria-label*="captions"]',
      'button[aria-label*="字幕"]', // Chinese
      'button[aria-label*="Phụ đề"]', // Vietnamese
      '[data-tooltip-target-id*="subtitle"]',
      '.ytp-menuitem[role="menuitemcheckbox"]',
      '[title*="subtitle"]',
      '[title*="caption"]'
    ]

    for (const selector of subtitleSelectors) {
      try {
        const button = document.querySelector(selector)
        if (button) {
          console.log(`✅ Found subtitle button: ${selector}`)

          // Check if button is disabled (means no subtitles available)
          const isDisabled =
            button.hasAttribute("disabled") ||
            button.getAttribute("aria-disabled") === "true" ||
            button.classList.contains("ytp-button-disabled")

          if (isDisabled) {
            console.log(`⚠️ Button is disabled, no subtitles available`)
            continue
          }

          // Button exists and not disabled = subtitles available
          const isActive =
            button.classList.contains("ytp-button-active") ||
            button.getAttribute("aria-pressed") === "true"
          console.log(
            `Button state: ${isActive ? "active" : "inactive"} (subtitles available)`
          )
          return true
        }
      } catch (error) {
        // Ignore errors, try next selector
      }
    }

    // Method 2: Check text tracks
    const videoElement = document.querySelector("video") as HTMLVideoElement
    if (videoElement?.textTracks && videoElement.textTracks.length > 0) {
      console.log(`✅ Found ${videoElement.textTracks.length} text tracks`)
      for (let i = 0; i < videoElement.textTracks.length; i++) {
        const track = videoElement.textTracks[i]
        console.log(
          `Track ${i}: kind=${track.kind}, label=${track.label}, language=${track.language}`
        )
        if (track.kind === "subtitles" || track.kind === "captions") {
          return true
        }
      }
    }

    // Method 3: Check subtitle containers
    const subtitleContainers = [
      ".caption-window",
      ".ytp-caption-window-container",
      ".captions-text",
      ".ytp-caption-segment",
      ".ytp-caption-window-bottom",
      ".html5-captions-text"
    ]

    for (const selector of subtitleContainers) {
      const container = document.querySelector(selector)
      if (container) {
        console.log(`✅ Found subtitle container: ${selector}`)
        if (container.textContent?.trim()) {
          console.log(
            `Container has content: "${container.textContent.trim().substring(0, 50)}..."`
          )
          return true
        }
      }
    }

    // Method 4: Check for YouTube player data
    try {
      // Check if there are any caption tracks in the page
      const scripts = document.querySelectorAll("script")
      for (const script of scripts) {
        if (
          script.textContent?.includes("captionTracks") ||
          script.textContent?.includes('"captions"')
        ) {
          console.log("✅ Found caption data in page scripts")
          return true
        }
      }
    } catch (e) {
      // Ignore errors
    }

    console.log("❌ No subtitles detected")
    return false
  }

  // Lấy danh sách ngôn ngữ subtitle từ DOM
  private getAvailableLanguagesFromDOM(): string[] {
    // Thử click vào nút subtitle để xem menu
    const subtitleButton = document.querySelector(
      ".ytp-subtitles-button"
    ) as HTMLElement
    if (subtitleButton) {
      // Tạm thời return empty array, sẽ implement logic phức tạp hơn sau
      return []
    }
    return []
  }

  // Lấy danh sách captions từ YouTube API
  async getVideoCaptions(videoId: string): Promise<YouTubeCaption[]> {
    try {
      if (!this.apiKey) {
        return []
      }

      const response = await fetch(
        `${API_ENDPOINTS.YOUTUBE_CAPTIONS}?part=snippet&videoId=${videoId}&key=${this.apiKey}`
      )

      if (!response.ok) {
        throw new Error(`Captions API request failed: ${response.status}`)
      }

      const data = await response.json()

      return (
        data.items?.map((item: any) => ({
          languageCode: item.snippet.language,
          name: item.snippet.name,
          url: `${API_ENDPOINTS.YOUTUBE_CAPTIONS}/${item.id}?key=${this.apiKey}`,
          isAutoGenerated: item.snippet.trackKind === "asr"
        })) || []
      )
    } catch (error) {
      console.error("Error getting video captions:", error)
      return []
    }
  }

  // Lấy subtitle content từ URL
  async getSubtitleContent(captionUrl: string): Promise<string> {
    try {
      const response = await fetch(captionUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch subtitle: ${response.status}`)
      }
      return await response.text()
    } catch (error) {
      console.error("Error getting subtitle content:", error)
      return ""
    }
  }

  // Parse duration từ ISO 8601 format (PT4M13S -> seconds)
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0

    const hours = parseInt(match[1] || "0")
    const minutes = parseInt(match[2] || "0")
    const seconds = parseInt(match[3] || "0")

    return hours * 3600 + minutes * 60 + seconds
  }

  // Main method để lấy subtitles (CHỈ DÙNG API)
  async getSubtitlesFromURL(
    videoId: string,
    languageCode: string = "en"
  ): Promise<SubtitleEntry[]> {
    try {
      console.log("🔍 Getting subtitles for:", videoId, languageCode)

      // ❌ DISABLED: DOM extraction (bị lỗi, không dùng được)
      // Lý do: DOM extraction không ổn định, subtitle elements thay đổi liên tục
      // const domSubtitles = await this.getSubtitlesFromDOM()
      // if (domSubtitles.length > 0) {
      //   console.log("Found subtitles from DOM:", domSubtitles.length)
      //   return domSubtitles
      // }

      // ❌ DISABLED: Video tracks extraction (bị lỗi, không dùng được)
      // Lý do: TextTracks API không reliable, tracks thường empty hoặc không accessible
      // const trackSubtitles = await this.extractSubtitlesFromTracks()
      // if (trackSubtitles.length > 0) {
      //   console.log("Found subtitles from tracks:", trackSubtitles.length)
      //   return trackSubtitles
      // }

      // ✅ TODO: Implement YouTube API caption download
      // Hiện tại chưa implement getCaptionsList và downloadCaption
      // Cần implement sau khi có YouTube Data API v3 setup đầy đủ
      if (this.apiKey) {
        console.warn(
          "⚠️ YouTube API caption download chưa implement, dùng mock data"
        )
        // TODO: Implement this
        // const captions = await this.getCaptionsList(videoId)
        // const subtitles = await this.downloadCaption(caption.id)
      } else {
        console.warn("⚠️ YouTube API key not set, using mock data")
      }

      // Fallback: tạo subtitle giả để test
      console.log("⚠️ No subtitles found, generating mock data")
      return this.generateMockSubtitles()
    } catch (error) {
      console.error("❌ Error getting subtitles:", error)
      return this.generateMockSubtitles()
    }
  }

  // Lấy subtitle từ DOM (fallback method)
  async getSubtitlesFromDOM(): Promise<SubtitleEntry[]> {
    try {
      // Method 1: Thử lấy từ DOM elements hiện tại
      const subtitleElements = document.querySelectorAll(
        ".captions-text, .ytp-caption-segment, .caption-window"
      )
      const subtitles: SubtitleEntry[] = []

      subtitleElements.forEach((element, index) => {
        const text = element.textContent?.trim()
        if (text) {
          subtitles.push({
            id: `dom-${index}`,
            start: index * 3, // Giả định mỗi subtitle 3 giây
            end: (index + 1) * 3,
            text
          })
        }
      })

      if (subtitles.length > 0) {
        return subtitles
      }

      // Method 2: Thử enable subtitle và extract
      return await this.enableAndExtractSubtitles()
    } catch (error) {
      console.error("Error extracting subtitles from DOM:", error)
      return []
    }
  }

  // Enable subtitle và extract
  private async enableAndExtractSubtitles(): Promise<SubtitleEntry[]> {
    try {
      // Tìm và click subtitle button
      const subtitleButton = document.querySelector(
        ".ytp-subtitles-button"
      ) as HTMLElement
      if (subtitleButton) {
        subtitleButton.click()

        // Đợi subtitle load
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Thử extract lại
        const elements = document.querySelectorAll(
          ".captions-text, .ytp-caption-segment"
        )
        const subtitles: SubtitleEntry[] = []

        elements.forEach((element, index) => {
          const text = element.textContent?.trim()
          if (text) {
            subtitles.push({
              id: `enabled-${index}`,
              start: index * 3,
              end: (index + 1) * 3,
              text
            })
          }
        })

        return subtitles
      }

      return []
    } catch (error) {
      console.error("Error enabling subtitles:", error)
      return []
    }
  }

  // Extract từ video tracks
  private async extractSubtitlesFromTracks(): Promise<SubtitleEntry[]> {
    try {
      const videoElement = document.querySelector("video") as HTMLVideoElement
      if (!videoElement?.textTracks) return []

      const subtitles: SubtitleEntry[] = []

      for (let i = 0; i < videoElement.textTracks.length; i++) {
        const track = videoElement.textTracks[i]
        if (track.kind === "subtitles" || track.kind === "captions") {
          track.mode = "showing"

          // Đợi track load
          await new Promise((resolve) => setTimeout(resolve, 500))

          if (track.cues) {
            for (let j = 0; j < track.cues.length; j++) {
              const cue = track.cues[j] as VTTCue
              subtitles.push({
                id: `track-${i}-${j}`,
                start: cue.startTime,
                end: cue.endTime,
                text: cue.text
              })
            }
          }
        }
      }

      return subtitles
    } catch (error) {
      console.error("Error extracting from tracks:", error)
      return []
    }
  }

  // Theo dõi thay đổi subtitle trong DOM
  observeSubtitleChanges(
    callback: (subtitle: SubtitleEntry) => void
  ): MutationObserver {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "childList" ||
          mutation.type === "characterData"
        ) {
          const subtitleContainer = document.querySelector(
            ".ytp-caption-window-container"
          )
          if (subtitleContainer) {
            const text = subtitleContainer.textContent?.trim()
            if (text) {
              const videoElement = document.querySelector(
                "video"
              ) as HTMLVideoElement
              const currentTime = videoElement?.currentTime || 0

              callback({
                id: `live-${Date.now()}`,
                start: currentTime,
                end: currentTime + 5, // Ước tính 5 giây
                text
              })
            }
          }
        }
      })
    })

    const subtitleContainer = document.querySelector(
      ".ytp-caption-window-container"
    )
    if (subtitleContainer) {
      observer.observe(subtitleContainer, {
        childList: true,
        subtree: true,
        characterData: true
      })
    }

    return observer
  }

  // Generate mock subtitles để test
  private generateMockSubtitles(): SubtitleEntry[] {
    return [
      {
        id: "mock-1",
        start: 0,
        end: 3,
        text: "Welcome to this YouTube video!"
      },
      {
        id: "mock-2",
        start: 3,
        end: 6,
        text: "This is a sample subtitle for testing."
      },
      {
        id: "mock-3",
        start: 6,
        end: 9,
        text: "The translation feature will work with real subtitles."
      },
      {
        id: "mock-4",
        start: 9,
        end: 12,
        text: "Please enable subtitles on the YouTube video."
      },
      {
        id: "mock-5",
        start: 12,
        end: 15,
        text: "Thank you for using our extension!"
      }
    ]
  }
}

export const youtubeAPI = new YouTubeAPIService()
