// Audio Playback Controller - Đồng bộ audio với video

import type { LanguageCode, SubtitleEntry, TTSOptions } from "../types"
import { textToSpeech } from "./text-to-speech"

interface AudioControllerOptions {
  syncWithVideo: boolean
  autoPlay: boolean
  volume: number
  rate: number
  pitch: number
}

interface AudioQueueItem {
  subtitle: SubtitleEntry
  startTime: number
  endTime: number
  options: TTSOptions
}

class AudioPlaybackController {
  private videoElement: HTMLVideoElement | null = null
  private audioQueue: AudioQueueItem[] = []
  private currentAudioItem: AudioQueueItem | null = null
  private isPlaying: boolean = false
  private isPaused: boolean = false
  private syncTimer: NodeJS.Timeout | null = null
  private options: AudioControllerOptions = {
    syncWithVideo: true,
    autoPlay: true,
    volume: 0.8,
    rate: 1.0,
    pitch: 1.0
  }

  constructor(videoElement?: HTMLVideoElement) {
    if (videoElement) {
      this.setVideoElement(videoElement)
    }
  }

  // Set video element để sync
  setVideoElement(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement
    this.setupVideoListeners()
  }

  // Cập nhật options
  updateOptions(newOptions: Partial<AudioControllerOptions>) {
    this.options = { ...this.options, ...newOptions }
  }

  // Thêm subtitle vào queue
  queueSubtitle(
    subtitle: SubtitleEntry,
    languageCode: LanguageCode,
    customOptions?: Partial<TTSOptions>
  ) {
    const audioItem: AudioQueueItem = {
      subtitle,
      startTime: subtitle.start,
      endTime: subtitle.end,
      options: {
        text: subtitle.translatedText || subtitle.text,
        language: this.getLanguageTag(languageCode),
        rate: this.options.rate,
        pitch: this.options.pitch,
        volume: this.options.volume,
        ...customOptions
      }
    }

    // Thêm vào queue theo thứ tự thời gian
    this.insertIntoQueue(audioItem)

    // Bắt đầu phát nếu auto play
    if (this.options.autoPlay && !this.isPlaying) {
      this.startPlayback()
    }
  }

  // Phát subtitle ngay lập tức (không queue)
  async playSubtitleNow(
    subtitle: SubtitleEntry,
    languageCode: LanguageCode,
    customOptions?: Partial<TTSOptions>
  ): Promise<void> {
    const options: TTSOptions = {
      text: subtitle.translatedText || subtitle.text,
      language: this.getLanguageTag(languageCode),
      rate: this.options.rate,
      pitch: this.options.pitch,
      volume: this.options.volume,
      ...customOptions
    }

    // Stop current audio
    this.stopCurrent()

    try {
      await textToSpeech.speak(options.text, options)
    } catch (error) {
      console.error("Error playing subtitle audio:", error)
      throw error
    }
  }

  // Bắt đầu playback từ queue
  startPlayback() {
    if (this.isPlaying || this.audioQueue.length === 0) {
      return
    }

    this.isPlaying = true
    this.isPaused = false

    if (this.options.syncWithVideo) {
      this.startSyncedPlayback()
    } else {
      this.startSequentialPlayback()
    }
  }

  // Dừng playback
  stopPlayback() {
    this.isPlaying = false
    this.isPaused = false
    this.stopCurrent()
    this.clearSyncTimer()
  }

  // Pause playback
  pausePlayback() {
    if (!this.isPlaying) return

    this.isPaused = true
    textToSpeech.pause()
    this.clearSyncTimer()
  }

  // Resume playback
  resumePlayback() {
    if (!this.isPaused) return

    this.isPaused = false
    textToSpeech.resume()

    if (this.options.syncWithVideo) {
      this.startSyncedPlayback()
    }
  }

  // Clear queue
  clearQueue() {
    this.audioQueue = []
    this.stopPlayback()
  }

  // Synced playback với video timeline
  private startSyncedPlayback() {
    if (!this.videoElement) {
      console.warn("No video element for synced playback")
      this.startSequentialPlayback()
      return
    }

    this.clearSyncTimer()

    this.syncTimer = setInterval(() => {
      if (!this.isPlaying || this.isPaused) {
        return
      }

      const currentTime = this.videoElement!.currentTime
      this.checkAndPlayAudioAtTime(currentTime)
    }, 100) // Check every 100ms
  }

  // Sequential playback (không sync với video)
  private async startSequentialPlayback() {
    while (this.isPlaying && !this.isPaused && this.audioQueue.length > 0) {
      const audioItem = this.audioQueue.shift()!

      try {
        await this.playAudioItem(audioItem)
      } catch (error) {
        console.error("Error in sequential playback:", error)
      }
    }

    this.isPlaying = false
  }

  // Kiểm tra và phát audio tại thời điểm cụ thể
  private checkAndPlayAudioAtTime(currentTime: number) {
    // Tìm audio item phù hợp với thời gian hiện tại
    const audioItem = this.findAudioItemAtTime(currentTime)

    if (audioItem && audioItem !== this.currentAudioItem) {
      this.playAudioItem(audioItem)
    } else if (!audioItem && this.currentAudioItem) {
      // Không có audio tại thời điểm này, stop current
      this.stopCurrent()
    }
  }

  // Tìm audio item tại thời điểm cụ thể
  private findAudioItemAtTime(time: number): AudioQueueItem | null {
    return (
      this.audioQueue.find(
        (item) => time >= item.startTime && time <= item.endTime
      ) || null
    )
  }

  // Phát một audio item
  private async playAudioItem(audioItem: AudioQueueItem): Promise<void> {
    this.currentAudioItem = audioItem

    try {
      await textToSpeech.speak(audioItem.options.text, audioItem.options, {
        onStart: () => {
          console.log("Audio started:", audioItem.subtitle.text)
        },
        onEnd: () => {
          console.log("Audio ended:", audioItem.subtitle.text)
          this.currentAudioItem = null
        },
        onError: (error) => {
          console.error("Audio error:", error)
          this.currentAudioItem = null
        }
      })
    } catch (error) {
      console.error("Error playing audio item:", error)
      this.currentAudioItem = null
      throw error
    }
  }

  // Stop current audio
  private stopCurrent() {
    textToSpeech.stop()
    this.currentAudioItem = null
  }

  // Insert audio item vào queue theo thứ tự thời gian
  private insertIntoQueue(audioItem: AudioQueueItem) {
    // Tìm vị trí phù hợp để insert
    let insertIndex = this.audioQueue.length

    for (let i = 0; i < this.audioQueue.length; i++) {
      if (audioItem.startTime < this.audioQueue[i].startTime) {
        insertIndex = i
        break
      }
    }

    this.audioQueue.splice(insertIndex, 0, audioItem)
  }

  // Setup video event listeners
  private setupVideoListeners() {
    if (!this.videoElement) return

    this.videoElement.addEventListener("play", () => {
      if (this.isPaused) {
        this.resumePlayback()
      }
    })

    this.videoElement.addEventListener("pause", () => {
      if (this.isPlaying) {
        this.pausePlayback()
      }
    })

    this.videoElement.addEventListener("seeked", () => {
      // Stop current audio khi user seek
      this.stopCurrent()

      if (this.options.syncWithVideo && this.isPlaying) {
        // Restart synced playback từ vị trí mới
        const currentTime = this.videoElement!.currentTime
        this.checkAndPlayAudioAtTime(currentTime)
      }
    })

    this.videoElement.addEventListener("ended", () => {
      this.stopPlayback()
    })
  }

  // Clear sync timer
  private clearSyncTimer() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  // Convert language code to language tag
  private getLanguageTag(languageCode: LanguageCode): string {
    const languageTags: Record<LanguageCode, string> = {
      auto: "en-US",
      vi: "vi-VN",
      en: "en-US",
      ja: "ja-JP",
      ko: "ko-KR",
      zh: "zh-CN",
      th: "th-TH",
      fr: "fr-FR",
      de: "de-DE",
      es: "es-ES",
      ru: "ru-RU",
      ar: "ar-SA",
      hi: "hi-IN",
      it: "it-IT",
      pt: "pt-PT",
      nl: "nl-NL",
      sv: "sv-SE",
      da: "da-DK",
      no: "no-NO",
      fi: "fi-FI",
      pl: "pl-PL",
      tr: "tr-TR",
      he: "he-IL",
      id: "id-ID",
      ms: "ms-MY"
    }

    return languageTags[languageCode] || "en-US"
  }

  // Public getters
  isPlaybackActive(): boolean {
    return this.isPlaying
  }

  isPlaybackPaused(): boolean {
    return this.isPaused
  }

  getCurrentAudioItem(): AudioQueueItem | null {
    return this.currentAudioItem
  }

  getQueueLength(): number {
    return this.audioQueue.length
  }

  getQueueItems(): AudioQueueItem[] {
    return [...this.audioQueue]
  }

  // Batch operations
  queueMultipleSubtitles(
    subtitles: SubtitleEntry[],
    languageCode: LanguageCode,
    customOptions?: Partial<TTSOptions>
  ) {
    subtitles.forEach((subtitle) => {
      this.queueSubtitle(subtitle, languageCode, customOptions)
    })
  }

  // Remove specific subtitle from queue
  removeFromQueue(subtitleId: string) {
    this.audioQueue = this.audioQueue.filter(
      (item) => item.subtitle.id !== subtitleId
    )
  }

  // Update queue item options
  updateQueueItemOptions(subtitleId: string, newOptions: Partial<TTSOptions>) {
    const item = this.audioQueue.find((item) => item.subtitle.id === subtitleId)
    if (item) {
      item.options = { ...item.options, ...newOptions }
    }
  }
}

export {
  AudioPlaybackController,
  type AudioQueueItem,
  type AudioControllerOptions
}
