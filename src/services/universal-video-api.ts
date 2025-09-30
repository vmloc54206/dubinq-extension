// Universal Video Platform API - Hoạt động trên mọi trang video
import type { SubtitleEntry, VideoInfo } from "../types"

interface PlatformConfig {
  name: string
  domain: string
  selectors: {
    video: string[]
    title: string[]
    subtitle: string[]
    subtitleButton: string[]
    subtitleContainer: string[]
  }
  extractVideoId: (url: string) => string | null
}

// Cấu hình cho từng platform
const PLATFORM_CONFIGS: PlatformConfig[] = [
  // YouTube
  {
    name: "YouTube",
    domain: "youtube.com",
    selectors: {
      video: ["video"],
      title: [
        "h1.ytd-video-primary-info-renderer",
        "#title h1",
        ".ytd-video-primary-info-renderer h1"
      ],
      subtitle: [
        ".ytp-caption-segment",
        ".captions-text",
        ".ytp-caption-window-container"
      ],
      subtitleButton: [".ytp-subtitles-button", ".ytp-caption-button"],
      subtitleContainer: [".ytp-caption-window-container", ".caption-window"]
    },
    extractVideoId: (url) => {
      const match = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
      )
      return match ? match[1] : null
    }
  },

  // Netflix
  {
    name: "Netflix",
    domain: "netflix.com",
    selectors: {
      video: ["video"],
      title: [
        ".video-title",
        ".player-status-main-title",
        'h1[data-uia="video-title"]'
      ],
      subtitle: [
        ".player-timedtext-text-container",
        ".player-timedtext",
        ".timedtext"
      ],
      subtitleButton: [
        '[data-uia="controls-subtitles"]',
        ".audio-subtitle-controller"
      ],
      subtitleContainer: [".player-timedtext-text-container"]
    },
    extractVideoId: (url) => {
      const match = url.match(/netflix\.com\/watch\/(\d+)/)
      return match ? match[1] : null
    }
  },

  // Vimeo
  {
    name: "Vimeo",
    domain: "vimeo.com",
    selectors: {
      video: ["video"],
      title: [".player-title", 'h1[data-name="title"]', ".clip-quote-title"],
      subtitle: [".vp-captions-cue", ".vp-captions", ".captions"],
      subtitleButton: [".vp-captions-button", '[aria-label*="captions"]'],
      subtitleContainer: [".vp-captions"]
    },
    extractVideoId: (url) => {
      const match = url.match(/vimeo\.com\/(\d+)/)
      return match ? match[1] : null
    }
  },

  // TikTok
  {
    name: "TikTok",
    domain: "tiktok.com",
    selectors: {
      video: ["video"],
      title: ['[data-e2e="browse-video-desc"]', ".video-meta-caption"],
      subtitle: [
        ".tiktok-captions",
        ".video-captions",
        '[data-e2e="video-caption"]'
      ],
      subtitleButton: ['[data-e2e="video-caption-btn"]'],
      subtitleContainer: [".tiktok-captions"]
    },
    extractVideoId: (url) => {
      const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
      return match ? match[1] : null
    }
  },

  // Facebook
  {
    name: "Facebook",
    domain: "facebook.com",
    selectors: {
      video: ["video"],
      title: ['[data-testid="post_message"]', ".userContent"],
      subtitle: ['[data-testid="captions"]', ".video-captions"],
      subtitleButton: ['[aria-label*="captions"]', '[aria-label*="subtitles"]'],
      subtitleContainer: ['[data-testid="captions"]']
    },
    extractVideoId: (url) => {
      const match = url.match(/facebook\.com\/.*\/videos\/(\d+)/)
      return match ? match[1] : null
    }
  },

  // Twitter/X
  {
    name: "Twitter",
    domain: "twitter.com",
    selectors: {
      video: ["video"],
      title: ['[data-testid="tweetText"]', ".tweet-text"],
      subtitle: [".tweet-video-captions", ".video-captions"],
      subtitleButton: ['[aria-label*="captions"]'],
      subtitleContainer: [".tweet-video-captions"]
    },
    extractVideoId: (url) => {
      const match = url.match(/twitter\.com\/.*\/status\/(\d+)/)
      return match ? match[1] : null
    }
  },

  // Bilibili
  {
    name: "Bilibili",
    domain: "bilibili.com",
    selectors: {
      video: ["video"],
      title: [".video-title", "h1[title]"],
      subtitle: [".bilibili-player-video-subtitle", ".subtitle-item-text"],
      subtitleButton: [".bilibili-player-video-btn-subtitle"],
      subtitleContainer: [".bilibili-player-video-subtitle"]
    },
    extractVideoId: (url) => {
      const match = url.match(/bilibili\.com\/video\/(BV\w+)/)
      return match ? match[1] : null
    }
  },

  // Coursera
  {
    name: "Coursera",
    domain: "coursera.org",
    selectors: {
      video: ["video"],
      title: [".video-name", "h1"],
      subtitle: [".rc-CML", ".captions"],
      subtitleButton: ['[data-testid="captions-button"]'],
      subtitleContainer: [".rc-CML"]
    },
    extractVideoId: (url) => {
      const match = url.match(/coursera\.org\/learn\/[^/]+\/lecture\/(\w+)/)
      return match ? match[1] : null
    }
  }
]

class UniversalVideoAPI {
  private currentPlatform: PlatformConfig | null = null

  // Detect platform hiện tại
  detectPlatform(): PlatformConfig | null {
    const hostname = window.location.hostname

    for (const config of PLATFORM_CONFIGS) {
      if (hostname.includes(config.domain)) {
        this.currentPlatform = config
        console.log(`Detected platform: ${config.name}`)
        return config
      }
    }

    // Fallback: Generic HTML5 video
    this.currentPlatform = this.createGenericConfig()
    console.log("Using generic HTML5 video config")
    return this.currentPlatform
  }

  // Tạo config generic cho các site không có trong list
  private createGenericConfig(): PlatformConfig {
    return {
      name: "Generic",
      domain: window.location.hostname,
      selectors: {
        video: ["video"],
        title: ["h1", "title", '[class*="title"]'],
        subtitle: [
          '[class*="caption"]',
          '[class*="subtitle"]',
          'track[kind="subtitles"]'
        ],
        subtitleButton: ['[aria-label*="subtitle"]', '[aria-label*="caption"]'],
        subtitleContainer: ['[class*="caption"]', '[class*="subtitle"]']
      },
      extractVideoId: (url) => {
        // Generic: sử dụng pathname làm ID
        return (
          window.location.pathname.replace(/[^a-zA-Z0-9]/g, "") || "generic"
        )
      }
    }
  }

  // Lấy thông tin video từ platform hiện tại
  async getVideoInfo(): Promise<VideoInfo | null> {
    const platform = this.currentPlatform || this.detectPlatform()
    if (!platform) {
      console.log("❌ No platform detected")
      return null
    }

    try {
      console.log(`🔍 Getting video info for platform: ${platform.name}`)

      // Lấy video element
      const videoElement = this.findElement(
        platform.selectors.video
      ) as HTMLVideoElement
      if (!videoElement) {
        console.log("❌ No video element found")
        return null
      }

      // Lấy title với multiple fallbacks
      let title = "Unknown Title"
      const titleSelectors = [
        ...platform.selectors.title,
        'h1[class*="title"]',
        '[data-testid*="title"]',
        ".video-title",
        "title"
      ]

      for (const selector of titleSelectors) {
        const titleElement = document.querySelector(selector)
        if (titleElement?.textContent?.trim()) {
          title = titleElement.textContent.trim()
          console.log(`✅ Found title: "${title}" using selector: ${selector}`)
          break
        }
      }

      // Lấy video ID
      const videoId = platform.extractVideoId(window.location.href) || "unknown"

      // Enhanced subtitle detection
      const hasSubtitles = await this.enhancedSubtitleCheck(platform)

      const duration = videoElement.duration || 0

      console.log(`✅ ${platform.name} video info:`, {
        videoId,
        title,
        duration: `${Math.floor(duration / 60)}:${Math.floor(duration % 60)
          .toString()
          .padStart(2, "0")}`,
        hasSubtitles
      })

      return {
        videoId,
        title,
        duration,
        hasSubtitles,
        availableLanguages: hasSubtitles ? ["auto"] : []
      }
    } catch (error) {
      console.error("❌ Error getting video info:", error)
      return null
    }
  }

  // Tìm element với multiple selectors
  private findElement(selectors: string[]): Element | null {
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        console.log(`Found element with selector: ${selector}`)
        return element
      }
    }
    return null
  }

  // Enhanced subtitle detection
  private async enhancedSubtitleCheck(
    platform: PlatformConfig
  ): Promise<boolean> {
    console.log(`🔍 Enhanced subtitle check for ${platform.name}`)

    // Method 1: Tìm subtitle button
    const subtitleButton = this.findElement(platform.selectors.subtitleButton)
    if (subtitleButton) {
      console.log("✅ Found subtitle button")
      return true
    }

    // Method 2: Tìm subtitle container
    const subtitleContainer = this.findElement(
      platform.selectors.subtitleContainer
    )
    if (subtitleContainer && subtitleContainer.textContent?.trim()) {
      console.log("✅ Found subtitle container with content")
      return true
    }

    // Method 3: Check video text tracks
    const videoElement = document.querySelector("video") as HTMLVideoElement
    if (videoElement?.textTracks && videoElement.textTracks.length > 0) {
      for (let i = 0; i < videoElement.textTracks.length; i++) {
        const track = videoElement.textTracks[i]
        if (track.kind === "subtitles" || track.kind === "captions") {
          console.log(
            `✅ Found video text track: ${track.label || track.language}`
          )
          return true
        }
      }
    }

    // Method 4: Try to find subtitle elements in DOM
    const subtitleSelectors = [
      ...platform.selectors.subtitle,
      ".caption-line",
      ".subtitle-line",
      '[class*="caption"]',
      '[class*="subtitle"]',
      '[data-testid*="caption"]'
    ]

    for (const selector of subtitleSelectors) {
      const element = document.querySelector(selector)
      if (element && element.textContent?.trim()) {
        console.log(`✅ Found subtitle element: ${selector}`)
        return true
      }
    }

    // Method 5: Platform-specific checks
    if (platform.name === "YouTube") {
      // Check for YouTube-specific subtitle indicators
      const ccButton = document.querySelector(
        ".ytp-subtitles-button, .ytp-caption-button"
      )
      if (ccButton) {
        console.log("✅ Found YouTube CC button")
        return true
      }
    }

    console.log("❌ No subtitles detected")
    return false
  }

  // Check xem có subtitle không (legacy method)
  private checkSubtitles(platform: PlatformConfig): boolean {
    // Simple synchronous check
    const subtitleButton = this.findElement(platform.selectors.subtitleButton)
    const subtitleContainer = this.findElement(
      platform.selectors.subtitleContainer
    )
    const videoElement = document.querySelector("video") as HTMLVideoElement

    return !!(
      subtitleButton ||
      (subtitleContainer && subtitleContainer.textContent?.trim()) ||
      (videoElement?.textTracks && videoElement.textTracks.length > 0)
    )
  }

  // Lấy subtitles từ platform hiện tại
  async getSubtitles(
    videoId: string,
    languageCode: string = "auto"
  ): Promise<SubtitleEntry[]> {
    const platform = this.currentPlatform || this.detectPlatform()
    if (!platform) return this.generateMockSubtitles()

    try {
      console.log(`Extracting subtitles from ${platform.name}...`)

      // Method 1: Extract từ DOM elements
      const domSubtitles = await this.extractFromDOM(platform)
      if (domSubtitles.length > 0) {
        console.log(`Found ${domSubtitles.length} subtitles from DOM`)
        return domSubtitles
      }

      // Method 2: Extract từ video tracks
      const trackSubtitles = await this.extractFromTracks()
      if (trackSubtitles.length > 0) {
        console.log(`Found ${trackSubtitles.length} subtitles from tracks`)
        return trackSubtitles
      }

      // Method 3: Try enable subtitles và extract
      const enabledSubtitles = await this.enableAndExtract(platform)
      if (enabledSubtitles.length > 0) {
        console.log(`Found ${enabledSubtitles.length} subtitles after enabling`)
        return enabledSubtitles
      }

      // Fallback: Mock data
      console.log("No subtitles found, using mock data")
      return this.generateMockSubtitles()
    } catch (error) {
      console.error("Error extracting subtitles:", error)
      return this.generateMockSubtitles()
    }
  }

  // Extract subtitles từ DOM
  private async extractFromDOM(
    platform: PlatformConfig
  ): Promise<SubtitleEntry[]> {
    const subtitles: SubtitleEntry[] = []

    for (const selector of platform.selectors.subtitle) {
      const elements = document.querySelectorAll(selector)

      elements.forEach((element, index) => {
        const text = element.textContent?.trim()
        if (text && text.length > 0) {
          subtitles.push({
            id: `${platform.name.toLowerCase()}-${index}`,
            start: index * 3,
            end: (index + 1) * 3,
            text
          })
        }
      })

      if (subtitles.length > 0) break
    }

    return subtitles
  }

  // Extract từ video text tracks
  private async extractFromTracks(): Promise<SubtitleEntry[]> {
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
  }

  // Enable subtitle button và extract
  private async enableAndExtract(
    platform: PlatformConfig
  ): Promise<SubtitleEntry[]> {
    try {
      // Tìm và click subtitle button
      const subtitleButton = this.findElement(
        platform.selectors.subtitleButton
      ) as HTMLElement

      if (subtitleButton) {
        console.log("Clicking subtitle button...")
        subtitleButton.click()

        // Đợi subtitle load
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Extract lại từ DOM
        return await this.extractFromDOM(platform)
      }

      return []
    } catch (error) {
      console.error("Error enabling subtitles:", error)
      return []
    }
  }

  // Generate mock subtitles cho demo
  private generateMockSubtitles(): SubtitleEntry[] {
    const platform = this.currentPlatform?.name || "Unknown"

    return [
      {
        id: "mock-1",
        start: 0,
        end: 3,
        text: `Welcome to this ${platform} video!`
      },
      {
        id: "mock-2",
        start: 3,
        end: 6,
        text: "This is a sample subtitle for testing translation."
      },
      {
        id: "mock-3",
        start: 6,
        end: 9,
        text: "Our extension works on multiple video platforms."
      },
      {
        id: "mock-4",
        start: 9,
        end: 12,
        text: "Enable subtitles on the video for better results."
      },
      {
        id: "mock-5",
        start: 12,
        end: 15,
        text: "Thank you for using our universal translator!"
      }
    ]
  }

  // Observe subtitle changes real-time
  observeSubtitleChanges(
    callback: (subtitle: SubtitleEntry) => void
  ): MutationObserver | null {
    const platform = this.currentPlatform || this.detectPlatform()
    if (!platform) return null

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "childList" ||
          mutation.type === "characterData"
        ) {
          // Tìm subtitle container
          const container = this.findElement(
            platform.selectors.subtitleContainer
          )

          if (container) {
            const text = container.textContent?.trim()
            if (text) {
              const videoElement = document.querySelector(
                "video"
              ) as HTMLVideoElement
              const currentTime = videoElement?.currentTime || 0

              callback({
                id: `live-${Date.now()}`,
                start: currentTime,
                end: currentTime + 5,
                text
              })
            }
          }
        }
      })
    })

    // Observe tất cả subtitle containers
    for (const selector of platform.selectors.subtitleContainer) {
      const container = document.querySelector(selector)
      if (container) {
        observer.observe(container, {
          childList: true,
          subtree: true,
          characterData: true
        })
        console.log(`Observing subtitle changes on: ${selector}`)
      }
    }

    return observer
  }
}

export const universalVideoAPI = new UniversalVideoAPI()
