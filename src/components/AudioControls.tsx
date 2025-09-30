// Audio Controls Component cho TTS

import React, { useEffect, useState } from "react"

import { textToSpeech } from "../services/text-to-speech"
import type { LanguageCode, TTSOptions } from "../types"
import { LANGUAGE_CODES } from "../types"

interface AudioControlsProps {
  isEnabled: boolean
  onToggle: (enabled: boolean) => void
  options: Partial<TTSOptions>
  onOptionsChange: (options: Partial<TTSOptions>) => void
  disabled?: boolean
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  isEnabled,
  onToggle,
  options,
  onOptionsChange,
  disabled = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([])
  const [testLanguage, setTestLanguage] = useState<LanguageCode>("vi")

  useEffect(() => {
    // Load available voices
    loadVoices()

    // Listen for voices changed event
    const handleVoicesChanged = () => {
      loadVoices()
    }

    window.speechSynthesis.addEventListener(
      "voiceschanged",
      handleVoicesChanged
    )

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        handleVoicesChanged
      )
    }
  }, [])

  useEffect(() => {
    // Update playing state
    const checkPlayingState = () => {
      setIsPlaying(textToSpeech.isSpeaking())
      setIsPaused(textToSpeech.isPaused())
    }

    const interval = setInterval(checkPlayingState, 100)
    return () => clearInterval(interval)
  }, [])

  const loadVoices = () => {
    const voices = textToSpeech.getAvailableVoices()
    setAvailableVoices(voices)
  }

  const handlePlay = async () => {
    if (isPaused) {
      textToSpeech.resume()
    } else {
      // Test TTS với ngôn ngữ đã chọn
      await textToSpeech.testTTS(testLanguage)
    }
  }

  const handlePause = () => {
    textToSpeech.pause()
  }

  const handleStop = () => {
    textToSpeech.stop()
  }

  const handleRateChange = (rate: number) => {
    onOptionsChange({ ...options, rate })
  }

  const handlePitchChange = (pitch: number) => {
    onOptionsChange({ ...options, pitch })
  }

  const handleVolumeChange = (volume: number) => {
    onOptionsChange({ ...options, volume })
  }

  const handleVoiceChange = (voiceName: string) => {
    onOptionsChange({ ...options, ttsVoice: voiceName })
  }

  const getVoicesForCurrentLanguage = () => {
    if (!options.language) return availableVoices

    const languageCode = options.language.split("-")[0]
    return availableVoices.filter((voice) =>
      voice.lang.toLowerCase().startsWith(languageCode.toLowerCase())
    )
  }

  return (
    <div className="bg-gradient-to-r from-white/80 to-gray-50/50 backdrop-blur-sm border border-white/30 rounded-2xl p-5 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></span>
          <label className="text-sm font-bold text-gray-800">
            Phát âm thanh
          </label>
        </div>
        <button
          type="button"
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 shadow-sm
            ${isEnabled ? "bg-gradient-to-r from-purple-500 to-blue-500" : "bg-gray-300"}
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
          `}
          onClick={() => !disabled && onToggle(!isEnabled)}
          disabled={disabled}>
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm
              ${isEnabled ? "translate-x-6" : "translate-x-1"}
            `}
          />
        </button>
      </div>

      {isEnabled && (
        <>
          {/* Test Language Selector */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Ngôn ngữ test
            </label>
            <select
              value={testLanguage}
              onChange={(e) => setTestLanguage(e.target.value as LanguageCode)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent">
              {Object.entries(LANGUAGE_CODES)
                .filter(([code]) => code !== "auto")
                .map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
            </select>
          </div>

          {/* Playback Controls */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="text-xs font-medium text-gray-700 mb-3">
              Điều khiển phát
            </h4>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                className={`
                  p-3 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-sm
                  ${
                    isPlaying && !isPaused
                      ? "bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-red-200"
                      : "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-200"
                  }
                  ${disabled ? "opacity-50 cursor-not-allowed transform-none" : ""}
                `}
                onClick={isPlaying && !isPaused ? handlePause : handlePlay}
                disabled={disabled}
                title={isPlaying && !isPaused ? "Tạm dừng" : "Phát"}>
                {isPlaying && !isPaused ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>

              <button
                type="button"
                className={`
                  p-3 rounded-xl bg-gradient-to-r from-gray-400 to-gray-600 text-white hover:from-gray-500 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-sm
                  ${disabled || !isPlaying ? "opacity-50 cursor-not-allowed transform-none" : ""}
                `}
                onClick={handleStop}
                disabled={disabled || !isPlaying}
                title="Dừng">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {isPlaying && (
                <div className="flex items-center text-sm font-medium">
                  <div
                    className={`w-2 h-2 rounded-full animate-pulse mr-2 ${isPaused ? "bg-yellow-500" : "bg-green-500"}`}></div>
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {isPaused ? "Đã tạm dừng" : "Đang phát"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Voice Selection */}
          {getVoicesForCurrentLanguage().length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giọng nói
              </label>
              <select
                value={options.ttsVoice || ""}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={disabled}>
                <option value="">Mặc định</option>
                {getVoicesForCurrentLanguage().map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} {voice.localService ? "(Local)" : "(Online)"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Speed Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tốc độ: {options.rate?.toFixed(1) || "1.0"}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={options.rate || 1.0}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={disabled}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Chậm</span>
              <span>Nhanh</span>
            </div>
          </div>

          {/* Pitch Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cao độ: {options.pitch?.toFixed(1) || "1.0"}
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={options.pitch || 1.0}
              onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={disabled}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Thấp</span>
              <span>Cao</span>
            </div>
          </div>

          {/* Volume Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Âm lượng: {Math.round((options.volume || 0.8) * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={options.volume || 0.8}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={disabled}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Nhỏ</span>
              <span>Lớn</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
