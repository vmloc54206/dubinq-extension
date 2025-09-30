// Main Translator Panel Component

import React, { useCallback, useEffect, useState } from "react"

import { textToSpeech } from "../services/text-to-speech"
import { translator } from "../services/translator"
import { universalVideoAPI } from "../services/universal-video-api"
import { youtubeAPI } from "../services/youtube-api"
import type {
  LanguageCode,
  SubtitleEntry,
  TranslationSettings,
  TranslatorState,
  VideoInfo
} from "../types"
import { DEFAULT_SETTINGS } from "../utils/constants"
import { storageManager } from "../utils/storage"
import { AudioControls } from "./AudioControls"
import { LanguageSelector } from "./LanguageSelector"

interface TranslatorPanelProps {
  videoId?: string
  onClose?: () => void
}

export const TranslatorPanel: React.FC<TranslatorPanelProps> = ({
  videoId,
  onClose
}) => {
  const [state, setState] = useState<TranslatorState>({
    isActive: false,
    isLoading: false,
    currentVideo: null,
    settings: DEFAULT_SETTINGS,
    subtitles: [],
    currentSubtitleIndex: -1
  })

  const [showSettings, setShowSettings] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    loadSettings()
    if (videoId) {
      loadVideoInfo(videoId)
    }
  }, [videoId])

  const loadSettings = async () => {
    try {
      const settings = await storageManager.getSettings()
      setState((prev) => ({ ...prev, settings }))
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  const loadVideoInfo = async (id: string) => {
    setState((prev) => ({ ...prev, isLoading: true }))
    setError(null)

    try {
      console.log("🔍 Loading video info for:", id)

      // Try Universal API first (works on all platforms)
      let videoInfo = await universalVideoAPI.getVideoInfo()

      if (!videoInfo) {
        console.log("🔄 Fallback to YouTube API...")
        videoInfo = await youtubeAPI.getVideoInfo(id)
      }

      if (videoInfo) {
        console.log("✅ Video info loaded:", {
          title: videoInfo.title,
          duration: videoInfo.duration,
          hasSubtitles: videoInfo.hasSubtitles
        })
        setState((prev) => ({
          ...prev,
          currentVideo: videoInfo,
          isLoading: false
        }))
      } else {
        console.log("❌ No video info found")
        setError("Không thể lấy thông tin video")
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("❌ Error loading video info:", error)
      setError("Lỗi khi tải thông tin video")
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const handleToggleTranslator = async () => {
    if (state.isActive) {
      // Stop translator
      setState((prev) => ({
        ...prev,
        isActive: false,
        subtitles: [],
        currentSubtitleIndex: -1
      }))
      textToSpeech.stop()
    } else {
      // Start translator
      await startTranslation()
    }
  }

  const startTranslation = async () => {
    if (!state.currentVideo) {
      setError("Không có thông tin video")
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, isActive: true }))
    setError(null)
    setProgress(0)

    try {
      // Lấy subtitles từ YouTube
      const subtitles = await getVideoSubtitles()

      if (subtitles.length === 0) {
        setError("Video này không có subtitle")
        setState((prev) => ({ ...prev, isLoading: false, isActive: false }))
        return
      }

      setState((prev) => ({ ...prev, subtitles }))

      // Dịch subtitles
      await translateSubtitles(subtitles)
    } catch (error) {
      console.error("Error starting translation:", error)
      setError("Lỗi khi bắt đầu dịch thuật")
      setState((prev) => ({ ...prev, isLoading: false, isActive: false }))
    }
  }

  const getVideoSubtitles = async (): Promise<SubtitleEntry[]> => {
    if (!state.currentVideo) return []

    try {
      console.log("🔍 Getting subtitles for:", state.currentVideo.videoId)

      // Method 1: Universal API (works on all platforms)
      const universalSubtitles = await universalVideoAPI.getSubtitles(
        state.currentVideo.videoId,
        state.settings.sourceLanguage
      )

      if (universalSubtitles.length > 0) {
        console.log(
          "✅ Found subtitles from Universal API:",
          universalSubtitles.length
        )
        return universalSubtitles
      }

      // Method 2: YouTube API (if available)
      const captions = await youtubeAPI.getVideoCaptions(
        state.currentVideo.videoId
      )

      if (captions.length > 0) {
        console.log("✅ Found captions from YouTube API:", captions.length)
        const preferredCaption =
          captions.find(
            (cap) => cap.languageCode === state.settings.sourceLanguage
          ) || captions[0]

        const captionContent = await youtubeAPI.getSubtitleContent(
          preferredCaption.url
        )
        if (captionContent) {
          // TODO: Parse subtitle content properly
          console.log("✅ Got caption content, length:", captionContent.length)
        }
      }

      // Method 3: DOM extraction
      console.log("🔄 Trying DOM extraction...")
      const domSubtitles = await youtubeAPI.getSubtitlesFromDOM()

      if (domSubtitles.length > 0) {
        console.log("✅ Found subtitles from DOM:", domSubtitles.length)
        return domSubtitles
      }

      // Method 4: Try to enable subtitles
      console.log("🔄 Attempting to enable subtitles...")
      const subtitleButton = document.querySelector(
        ".ytp-subtitles-button, .ytp-caption-button"
      ) as HTMLElement
      if (
        subtitleButton &&
        !subtitleButton.classList.contains("ytp-button-active")
      ) {
        subtitleButton.click()
        await new Promise((resolve) => setTimeout(resolve, 2000))

        const enabledSubtitles = await youtubeAPI.getSubtitlesFromDOM()
        if (enabledSubtitles.length > 0) {
          console.log(
            "✅ Found subtitles after enabling:",
            enabledSubtitles.length
          )
          return enabledSubtitles
        }
      }

      console.log("❌ No subtitles found, using mock data for demo")
      return []
    } catch (error) {
      console.error("❌ Error getting subtitles:", error)
      return []
    }
  }

  const translateSubtitles = async (subtitles: SubtitleEntry[]) => {
    const translatedSubtitles = await translator.translateSubtitles(
      subtitles,
      state.settings.targetLanguage,
      state.settings.sourceLanguage,
      (progress) => setProgress(progress)
    )

    setState((prev) => ({
      ...prev,
      subtitles: translatedSubtitles,
      isLoading: false
    }))
  }

  const handleSettingsChange = async (
    newSettings: Partial<TranslationSettings>
  ) => {
    const updatedSettings = { ...state.settings, ...newSettings }
    setState((prev) => ({ ...prev, settings: updatedSettings }))
    await storageManager.saveSettings(updatedSettings)
  }

  const handleTTSOptionsChange = (options: any) => {
    handleSettingsChange({
      enableTTS: options.enableTTS ?? state.settings.enableTTS,
      ttsSpeed: options.rate ?? state.settings.ttsSpeed,
      ttsVoice: options.ttsVoice ?? state.settings.ttsVoice
    })
  }

  return (
    <div className="bg-white w-96 max-h-[32rem] overflow-hidden rounded-xl shadow-xl border border-gray-200">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">
            Dubinq Translator
          </h3>
          <p className="text-xs text-gray-500">Real-time video translation</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
            title="Cài đặt">
            Settings
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
              title="Đóng">
              Close
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-h-80 overflow-y-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            <div className="flex items-center space-x-2">
              <svg
                className="w-4 h-4 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {state.isLoading && (
          <div className="text-center py-8">
            <div className="relative">
              <div className="w-12 h-12 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-purple-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 animate-spin"></div>
              </div>
              <p className="text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {progress > 0
                  ? `Đang dịch... ${Math.round(progress * 100)}%`
                  : "Đang tải..."}
              </p>
            </div>
          </div>
        )}

        {!showSettings ? (
          <MainPanel
            state={state}
            onToggle={handleToggleTranslator}
            onSettingsChange={handleSettingsChange}
          />
        ) : (
          <SettingsPanel
            settings={state.settings}
            onSettingsChange={handleSettingsChange}
            onTTSOptionsChange={handleTTSOptionsChange}
            onBack={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  )
}

// Main Panel Component
interface MainPanelProps {
  state: TranslatorState
  onToggle: () => void
  onSettingsChange: (settings: Partial<TranslationSettings>) => void
}

const MainPanel: React.FC<MainPanelProps> = ({
  state,
  onToggle,
  onSettingsChange
}) => {
  return (
    <div className="space-y-6">
      {/* Video Info */}
      {state.currentVideo && (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
              {state.currentVideo.title || "Unknown Title"}
            </h4>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                Duration: {formatDuration(state.currentVideo.duration)}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  state.currentVideo.hasSubtitles
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}>
                {state.currentVideo.hasSubtitles ? "Subtitles" : "No subtitles"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Language Selection */}
      <div className="space-y-4">
        <h5 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
          <span className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></span>
          <span>Chọn ngôn ngữ</span>
        </h5>
        <div className="grid grid-cols-2 gap-4">
          <LanguageSelector
            value={state.settings.sourceLanguage as LanguageCode}
            onChange={(lang) => onSettingsChange({ sourceLanguage: lang })}
            label="Từ"
            disabled={state.isLoading}
          />
          <LanguageSelector
            value={state.settings.targetLanguage as LanguageCode}
            onChange={(lang) => onSettingsChange({ targetLanguage: lang })}
            label="Sang"
            showRecent={true}
            disabled={state.isLoading}
          />
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        disabled={state.isLoading || !state.currentVideo}
        className={`
          w-full py-3 px-6 rounded-lg font-medium text-sm transition-colors duration-200
          ${
            state.isActive
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-black hover:bg-gray-800 text-white"
          }
          ${state.isLoading || !state.currentVideo ? "opacity-50 cursor-not-allowed" : ""}
        `}>
        <div className="flex items-center justify-center space-x-2">
          <span className="text-lg">{state.isActive ? "⏹️" : "▶️"}</span>
          <span>
            {state.isActive ? "Dừng dịch thuật" : "Bắt đầu dịch thuật"}
          </span>
        </div>
      </button>

      {/* Current Subtitle Display */}
      {state.isActive && state.subtitles.length > 0 && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
          <CurrentSubtitleDisplay
            subtitles={state.subtitles}
            currentIndex={state.currentSubtitleIndex}
          />
        </div>
      )}

      {/* Stats */}
      {state.subtitles.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50/50 to-blue-50/50 backdrop-blur-sm rounded-xl p-3 border border-white/20">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-600">
            <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
            <span className="font-medium">
              Đã dịch {state.subtitles.filter((s) => s.translatedText).length}/
              {state.subtitles.length} câu
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Settings Panel Component
interface SettingsPanelProps {
  settings: TranslationSettings
  onSettingsChange: (settings: Partial<TranslationSettings>) => void
  onTTSOptionsChange: (options: any) => void
  onBack: () => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onTTSOptionsChange,
  onBack
}) => {
  return (
    <div className="space-y-4">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900">
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
        Quay lại
      </button>

      {/* Auto Detect */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Tự động nhận diện ngôn ngữ
        </label>
        <button
          type="button"
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${settings.autoDetect ? "bg-blue-600" : "bg-gray-200"}
          `}
          onClick={() =>
            onSettingsChange({ autoDetect: !settings.autoDetect })
          }>
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${settings.autoDetect ? "translate-x-6" : "translate-x-1"}
            `}
          />
        </button>
      </div>

      {/* Audio Controls */}
      <AudioControls
        isEnabled={settings.enableTTS}
        onToggle={(enabled) => onSettingsChange({ enableTTS: enabled })}
        options={{
          rate: settings.ttsSpeed,
          pitch: 1.0,
          volume: 0.8,
          language: `${settings.targetLanguage}-VN`,
          ttsVoice: settings.ttsVoice
        }}
        onOptionsChange={onTTSOptionsChange}
      />
    </div>
  )
}

// Current Subtitle Display Component
interface CurrentSubtitleDisplayProps {
  subtitles: SubtitleEntry[]
  currentIndex: number
}

const CurrentSubtitleDisplay: React.FC<CurrentSubtitleDisplayProps> = ({
  subtitles,
  currentIndex
}) => {
  const currentSubtitle = currentIndex >= 0 ? subtitles[currentIndex] : null

  if (!currentSubtitle) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 text-center text-sm text-gray-500">
        Chờ subtitle...
      </div>
    )
  }

  return (
    <div className="bg-blue-50 rounded-lg p-3 space-y-2">
      <div className="text-xs text-gray-600">Gốc:</div>
      <div className="text-sm text-gray-900">{currentSubtitle.text}</div>

      {currentSubtitle.translatedText && (
        <>
          <div className="text-xs text-blue-600">Dịch:</div>
          <div className="text-sm font-medium text-blue-900">
            {currentSubtitle.translatedText}
          </div>
        </>
      )}
    </div>
  )
}

// Helper function
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}
