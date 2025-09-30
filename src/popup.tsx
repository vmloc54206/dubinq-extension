import React, { useEffect, useState } from "react"

import { TranslatorPanel } from "./components/TranslatorPanel"
import { universalVideoAPI } from "./services/universal-video-api"
import { storageManager } from "./utils/storage"

import "~style.css"

function IndexPopup() {
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null)
  const [isVideoPage, setIsVideoPage] = useState(false)
  const [currentPlatform, setCurrentPlatform] = useState("Unknown")
  const [isEnabled, setIsEnabled] = useState(true)

  useEffect(() => {
    checkCurrentTab()
    loadSettings()
  }, [])

  const checkCurrentTab = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })

      const url = tab?.url || ""

      // Detect platform và video page
      let platform = "Unknown"
      let isVideo = false
      let videoId = null

      if (url.includes("youtube.com")) {
        platform = "YouTube"
        isVideo = url.includes("/watch")
        if (isVideo) {
          const match = url.match(/[?&]v=([^&]+)/)
          videoId = match ? match[1] : null
        }
      } else if (url.includes("netflix.com")) {
        platform = "Netflix"
        isVideo = url.includes("/watch/")
        if (isVideo) {
          const match = url.match(/netflix\.com\/watch\/(\d+)/)
          videoId = match ? match[1] : null
        }
      } else if (url.includes("vimeo.com")) {
        platform = "Vimeo"
        isVideo = /vimeo\.com\/\d+/.test(url)
        if (isVideo) {
          const match = url.match(/vimeo\.com\/(\d+)/)
          videoId = match ? match[1] : null
        }
      } else if (url.includes("tiktok.com")) {
        platform = "TikTok"
        isVideo = url.includes("/video/")
      } else if (url.includes("facebook.com")) {
        platform = "Facebook"
        isVideo = url.includes("/videos/")
      } else if (url.includes("twitter.com") || url.includes("x.com")) {
        platform = "Twitter/X"
        isVideo = url.includes("/status/")
      } else if (url.includes("bilibili.com")) {
        platform = "Bilibili"
        isVideo = url.includes("/video/")
      } else if (url.includes("coursera.org")) {
        platform = "Coursera"
        isVideo = url.includes("/lecture/")
      } else if (url.includes("twitch.tv")) {
        platform = "Twitch"
        isVideo = !url.includes("/directory")
      }

      setCurrentPlatform(platform)
      setIsVideoPage(isVideo)
      setCurrentVideoId(videoId)
    } catch (error) {
      console.error("Error checking current tab:", error)
    }
  }

  const loadSettings = async () => {
    try {
      const enabled = await storageManager.getIsEnabled()
      setIsEnabled(enabled)
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  const handleToggleEnabled = async () => {
    try {
      const newEnabled = !isEnabled
      await storageManager.setIsEnabled(newEnabled)
      setIsEnabled(newEnabled)
    } catch (error) {
      console.error("Error toggling enabled state:", error)
    }
  }

  const openYouTube = () => {
    chrome.tabs.create({ url: "https://www.youtube.com" })
    window.close()
  }

  if (!isVideoPage) {
    return (
      <div className="w-96 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">🌐</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Dubinq Translator
              </h2>
              <p className="text-xs text-gray-500">
                Real-time video translation for {currentPlatform}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎬</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Chưa phát hiện video trên {currentPlatform}
            </h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Vui lòng mở một video trên {currentPlatform} hoặc các platform
              khác được hỗ trợ để sử dụng tính năng dịch thuật realtime.
            </p>
            <button
              onClick={openYouTube}
              className="w-full bg-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200">
              <div className="flex items-center justify-center space-x-2">
                <span>
                  Mở{" "}
                  {currentPlatform === "Unknown"
                    ? "Video Platform"
                    : currentPlatform}
                </span>
              </div>
            </button>
          </div>

          {/* Settings */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Extension Status
              </span>
              <button
                onClick={handleToggleEnabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${
                  isEnabled ? "bg-black" : "bg-gray-200"
                }`}>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-96 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      <TranslatorPanel videoId={currentVideoId || undefined} />
    </div>
  )
}

export default IndexPopup
