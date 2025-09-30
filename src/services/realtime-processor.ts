// Realtime Subtitle Processing Service

import type { SubtitleEntry, TranslationSettings, LanguageCode } from '../types';
import { translator } from './translator';
import { textToSpeech } from './text-to-speech';
import { subtitleParser } from './subtitle-parser';
import { DEBOUNCE_DELAYS } from '../utils/constants';

interface ProcessorCallbacks {
  onSubtitleUpdate?: (subtitle: SubtitleEntry) => void;
  onTranslationComplete?: (subtitle: SubtitleEntry) => void;
  onError?: (error: Error) => void;
}

class RealtimeSubtitleProcessor {
  private isActive: boolean = false;
  private currentVideo: HTMLVideoElement | null = null;
  private subtitles: SubtitleEntry[] = [];
  private currentSubtitleIndex: number = -1;
  private settings: TranslationSettings;
  private callbacks: ProcessorCallbacks = {};
  
  // Debouncing và caching
  private translationCache: Map<string, string> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastProcessedTime: number = 0;
  
  // Queue management
  private translationQueue: SubtitleEntry[] = [];
  private isProcessingQueue: boolean = false;

  constructor(settings: TranslationSettings) {
    this.settings = settings;
  }

  // Khởi tạo processor với video element
  initialize(videoElement: HTMLVideoElement, callbacks: ProcessorCallbacks = {}) {
    this.currentVideo = videoElement;
    this.callbacks = callbacks;
    this.setupVideoListeners();
  }

  // Bắt đầu xử lý realtime
  start(subtitles: SubtitleEntry[] = []) {
    if (!this.currentVideo) {
      throw new Error('Video element not initialized');
    }

    this.isActive = true;
    this.subtitles = subtitles;
    this.currentSubtitleIndex = -1;
    this.lastProcessedTime = 0;

    // Bắt đầu sync loop
    this.startSyncLoop();
    
    console.log('Realtime subtitle processor started');
  }

  // Dừng xử lý
  stop() {
    this.isActive = false;
    this.clearDebounceTimer();
    textToSpeech.stop();
    
    console.log('Realtime subtitle processor stopped');
  }

  // Cập nhật settings
  updateSettings(newSettings: Partial<TranslationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  // Setup video event listeners
  private setupVideoListeners() {
    if (!this.currentVideo) return;

    // Listen for time updates
    this.currentVideo.addEventListener('timeupdate', () => {
      if (this.isActive) {
        this.handleTimeUpdate();
      }
    });

    // Listen for seeking
    this.currentVideo.addEventListener('seeked', () => {
      if (this.isActive) {
        this.handleSeek();
      }
    });

    // Listen for play/pause
    this.currentVideo.addEventListener('play', () => {
      if (this.isActive && this.settings.enableTTS) {
        textToSpeech.resume();
      }
    });

    this.currentVideo.addEventListener('pause', () => {
      if (this.isActive && this.settings.enableTTS) {
        textToSpeech.pause();
      }
    });
  }

  // Main sync loop
  private startSyncLoop() {
    const syncInterval = setInterval(() => {
      if (!this.isActive) {
        clearInterval(syncInterval);
        return;
      }

      this.syncSubtitles();
    }, 100); // Check every 100ms
  }

  // Sync subtitles với video timeline
  private syncSubtitles() {
    if (!this.currentVideo || this.subtitles.length === 0) return;

    const currentTime = this.currentVideo.currentTime;
    const currentSubtitle = this.findSubtitleAtTime(currentTime);

    if (currentSubtitle) {
      const newIndex = this.subtitles.indexOf(currentSubtitle);
      
      if (newIndex !== this.currentSubtitleIndex) {
        this.currentSubtitleIndex = newIndex;
        this.processCurrentSubtitle(currentSubtitle);
      }
    } else if (this.currentSubtitleIndex !== -1) {
      // No subtitle at current time
      this.currentSubtitleIndex = -1;
      this.callbacks.onSubtitleUpdate?.(null as any);
    }
  }

  // Tìm subtitle tại thời điểm cụ thể
  private findSubtitleAtTime(time: number): SubtitleEntry | null {
    return subtitleParser.findSubtitleAtTime(this.subtitles, time);
  }

  // Xử lý subtitle hiện tại
  private processCurrentSubtitle(subtitle: SubtitleEntry) {
    // Debounce để tránh xử lý quá nhiều
    this.clearDebounceTimer();
    
    this.debounceTimer = setTimeout(() => {
      this.handleSubtitleChange(subtitle);
    }, DEBOUNCE_DELAYS.SUBTITLE_UPDATE);
  }

  // Xử lý khi subtitle thay đổi
  private async handleSubtitleChange(subtitle: SubtitleEntry) {
    try {
      // Callback ngay lập tức với subtitle gốc
      this.callbacks.onSubtitleUpdate?.(subtitle);

      // Kiểm tra cache trước
      const cacheKey = `${subtitle.text}|${this.settings.sourceLanguage}|${this.settings.targetLanguage}`;
      
      if (this.translationCache.has(cacheKey)) {
        const translatedText = this.translationCache.get(cacheKey)!;
        const translatedSubtitle = { ...subtitle, translatedText };
        
        this.callbacks.onTranslationComplete?.(translatedSubtitle);
        
        // Phát audio nếu được enable
        if (this.settings.enableTTS) {
          this.speakSubtitle(translatedSubtitle);
        }
        
        return;
      }

      // Thêm vào queue để dịch
      this.addToTranslationQueue(subtitle);

    } catch (error) {
      console.error('Error handling subtitle change:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  // Thêm subtitle vào queue dịch thuật
  private addToTranslationQueue(subtitle: SubtitleEntry) {
    // Tránh duplicate
    const exists = this.translationQueue.find(s => s.id === subtitle.id);
    if (exists) return;

    this.translationQueue.push(subtitle);
    this.processTranslationQueue();
  }

  // Xử lý queue dịch thuật
  private async processTranslationQueue() {
    if (this.isProcessingQueue || this.translationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.translationQueue.length > 0) {
      const subtitle = this.translationQueue.shift()!;
      
      try {
        await this.translateSubtitle(subtitle);
      } catch (error) {
        console.error('Error translating subtitle:', error);
        this.callbacks.onError?.(error as Error);
      }

      // Rate limiting
      await this.delay(DEBOUNCE_DELAYS.TRANSLATION);
    }

    this.isProcessingQueue = false;
  }

  // Dịch một subtitle
  private async translateSubtitle(subtitle: SubtitleEntry) {
    try {
      const translatedSubtitle = await translator.translateRealtime(
        subtitle,
        this.settings.targetLanguage,
        this.settings.sourceLanguage
      );

      // Lưu vào cache
      const cacheKey = `${subtitle.text}|${this.settings.sourceLanguage}|${this.settings.targetLanguage}`;
      this.translationCache.set(cacheKey, translatedSubtitle.translatedText || subtitle.text);

      // Callback
      this.callbacks.onTranslationComplete?.(translatedSubtitle);

      // Phát audio nếu đây là subtitle hiện tại
      if (this.currentSubtitleIndex >= 0 && 
          this.subtitles[this.currentSubtitleIndex]?.id === subtitle.id &&
          this.settings.enableTTS) {
        this.speakSubtitle(translatedSubtitle);
      }

    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  // Phát audio cho subtitle
  private async speakSubtitle(subtitle: SubtitleEntry) {
    if (!this.settings.enableTTS || !subtitle.translatedText) return;

    try {
      await textToSpeech.speakSubtitle(
        subtitle,
        this.settings.targetLanguage,
        {
          rate: this.settings.ttsSpeed,
          pitch: 1.0,
          volume: 0.8
        }
      );
    } catch (error) {
      console.error('TTS error:', error);
    }
  }

  // Handle video time update
  private handleTimeUpdate() {
    const currentTime = this.currentVideo?.currentTime || 0;
    
    // Throttle để tránh xử lý quá nhiều
    if (Math.abs(currentTime - this.lastProcessedTime) < 0.1) {
      return;
    }
    
    this.lastProcessedTime = currentTime;
  }

  // Handle video seek
  private handleSeek() {
    // Stop current TTS
    textToSpeech.stop();
    
    // Clear queue
    this.translationQueue = [];
    
    // Reset current subtitle
    this.currentSubtitleIndex = -1;
    
    // Force sync
    this.syncSubtitles();
  }

  // Utility methods
  private clearDebounceTimer() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public getters
  getCurrentSubtitle(): SubtitleEntry | null {
    return this.currentSubtitleIndex >= 0 ? this.subtitles[this.currentSubtitleIndex] : null;
  }

  getCurrentSubtitleIndex(): number {
    return this.currentSubtitleIndex;
  }

  getSubtitles(): SubtitleEntry[] {
    return [...this.subtitles];
  }

  isRunning(): boolean {
    return this.isActive;
  }

  // Cache management
  clearCache() {
    this.translationCache.clear();
  }

  getCacheSize(): number {
    return this.translationCache.size;
  }
}

export { RealtimeSubtitleProcessor };
