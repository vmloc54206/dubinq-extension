// Text-to-Speech Service sử dụng Web Speech API

import type { TTSOptions, LanguageCode, SubtitleEntry } from '../types';
import { TTS_VOICES } from '../utils/constants';

// Interface cho TTS event callbacks
interface TTSCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent) => void;
  onPause?: () => void;
  onResume?: () => void;
}

class TextToSpeechService {
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPlaying: boolean = false;
  private queue: SpeechSynthesisUtterance[] = [];
  private defaultOptions: TTSOptions = {
    text: '',
    language: 'vi-VN',
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8
  };

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeVoices();
  }

  // Khởi tạo và load voices
  private initializeVoices(): void {
    // Voices có thể load async, nên cần đợi
    if (this.synthesis.getVoices().length === 0) {
      this.synthesis.addEventListener('voiceschanged', () => {
        console.log('Voices loaded:', this.getAvailableVoices().length);
      });
    }
  }

  // Lấy danh sách voices có sẵn
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  // Lấy voices cho ngôn ngữ cụ thể
  getVoicesForLanguage(languageCode: LanguageCode): SpeechSynthesisVoice[] {
    const voices = this.getAvailableVoices();
    return voices.filter(voice => 
      voice.lang.startsWith(languageCode) || 
      voice.lang.toLowerCase().includes(languageCode)
    );
  }

  // Tìm voice tốt nhất cho ngôn ngữ
  getBestVoiceForLanguage(languageCode: LanguageCode): SpeechSynthesisVoice | null {
    const voices = this.getVoicesForLanguage(languageCode);
    
    if (voices.length === 0) {
      return null;
    }

    // Ưu tiên voice local trước
    const localVoice = voices.find(voice => voice.localService);
    if (localVoice) {
      return localVoice;
    }

    // Sau đó ưu tiên voice default
    const defaultVoice = voices.find(voice => voice.default);
    if (defaultVoice) {
      return defaultVoice;
    }

    // Cuối cùng lấy voice đầu tiên
    return voices[0];
  }

  // Speak text với options tùy chỉnh
  async speak(
    text: string, 
    options: Partial<TTSOptions> = {},
    callbacks: TTSCallbacks = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Stop current speech nếu đang phát
      this.stop();

      const finalOptions = { ...this.defaultOptions, ...options, text };
      const utterance = this.createUtterance(finalOptions);

      // Set callbacks
      utterance.onstart = () => {
        this.isPlaying = true;
        callbacks.onStart?.();
      };

      utterance.onend = () => {
        this.isPlaying = false;
        this.currentUtterance = null;
        callbacks.onEnd?.();
        resolve();
      };

      utterance.onerror = (event) => {
        this.isPlaying = false;
        this.currentUtterance = null;
        callbacks.onError?.(event);
        reject(new Error(`TTS Error: ${event.error}`));
      };

      utterance.onpause = () => {
        callbacks.onPause?.();
      };

      utterance.onresume = () => {
        callbacks.onResume?.();
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  // Speak subtitle với timing
  async speakSubtitle(
    subtitle: SubtitleEntry,
    languageCode: LanguageCode,
    options: Partial<TTSOptions> = {}
  ): Promise<void> {
    const text = subtitle.translatedText || subtitle.text;
    
    return this.speak(text, {
      ...options,
      language: this.getLanguageTag(languageCode)
    });
  }

  // Speak multiple subtitles in sequence
  async speakSubtitles(
    subtitles: SubtitleEntry[],
    languageCode: LanguageCode,
    options: Partial<TTSOptions> = {},
    onProgress?: (index: number, total: number) => void
  ): Promise<void> {
    for (let i = 0; i < subtitles.length; i++) {
      const subtitle = subtitles[i];
      
      try {
        await this.speakSubtitle(subtitle, languageCode, options);
        onProgress?.(i + 1, subtitles.length);
      } catch (error) {
        console.error(`Error speaking subtitle ${i}:`, error);
      }
    }
  }

  // Queue subtitle for speaking
  queueSubtitle(
    subtitle: SubtitleEntry,
    languageCode: LanguageCode,
    options: Partial<TTSOptions> = {}
  ): void {
    const text = subtitle.translatedText || subtitle.text;
    const finalOptions = { 
      ...this.defaultOptions, 
      ...options, 
      text,
      language: this.getLanguageTag(languageCode)
    };
    
    const utterance = this.createUtterance(finalOptions);
    this.queue.push(utterance);
  }

  // Process queue
  processQueue(): void {
    if (this.queue.length === 0 || this.isPlaying) {
      return;
    }

    const utterance = this.queue.shift()!;
    
    utterance.onend = () => {
      this.isPlaying = false;
      this.currentUtterance = null;
      // Process next in queue
      setTimeout(() => this.processQueue(), 100);
    };

    utterance.onerror = () => {
      this.isPlaying = false;
      this.currentUtterance = null;
      // Process next in queue even on error
      setTimeout(() => this.processQueue(), 100);
    };

    this.currentUtterance = utterance;
    this.isPlaying = true;
    this.synthesis.speak(utterance);
  }

  // Clear queue
  clearQueue(): void {
    this.queue = [];
  }

  // Create utterance from options
  private createUtterance(options: TTSOptions): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(options.text);
    
    utterance.lang = options.language;
    utterance.rate = options.rate;
    utterance.pitch = options.pitch;
    utterance.volume = options.volume;

    // Set voice nếu có
    const voice = this.getBestVoiceForLanguage(this.getLanguageCodeFromTag(options.language));
    if (voice) {
      utterance.voice = voice;
    }

    return utterance;
  }

  // Convert language code to language tag
  private getLanguageTag(languageCode: LanguageCode): string {
    const languageTags: Record<LanguageCode, string> = {
      'vi': 'vi-VN',
      'en': 'en-US',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'zh': 'zh-CN',
      'th': 'th-TH',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'es': 'es-ES',
      'ru': 'ru-RU',
      'ar': 'ar-SA',
      'hi': 'hi-IN'
    };

    return languageTags[languageCode] || 'en-US';
  }

  // Convert language tag to language code
  private getLanguageCodeFromTag(languageTag: string): LanguageCode {
    const code = languageTag.split('-')[0] as LanguageCode;
    return code || 'en';
  }

  // Pause current speech
  pause(): void {
    if (this.isPlaying) {
      this.synthesis.pause();
    }
  }

  // Resume paused speech
  resume(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  // Stop current speech
  stop(): void {
    this.synthesis.cancel();
    this.isPlaying = false;
    this.currentUtterance = null;
  }

  // Check if currently speaking
  isSpeaking(): boolean {
    return this.isPlaying || this.synthesis.speaking;
  }

  // Check if paused
  isPaused(): boolean {
    return this.synthesis.paused;
  }

  // Set default options
  setDefaultOptions(options: Partial<TTSOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  // Get current options
  getDefaultOptions(): TTSOptions {
    return { ...this.defaultOptions };
  }

  // Test TTS với sample text
  async testTTS(languageCode: LanguageCode): Promise<boolean> {
    const testTexts: Record<LanguageCode, string> = {
      'vi': 'Xin chào, đây là bài kiểm tra giọng nói tiếng Việt.',
      'en': 'Hello, this is a voice test in English.',
      'ja': 'こんにちは、これは日本語の音声テストです。',
      'ko': '안녕하세요, 이것은 한국어 음성 테스트입니다.',
      'zh': '你好，这是中文语音测试。',
      'th': 'สวัสดี นี่คือการทดสอบเสียงภาษาไทย',
      'fr': 'Bonjour, ceci est un test vocal en français.',
      'de': 'Hallo, das ist ein Sprachtest auf Deutsch.',
      'es': 'Hola, esta es una prueba de voz en español.',
      'ru': 'Привет, это голосовой тест на русском языке.',
      'ar': 'مرحبا، هذا اختبار صوتي باللغة العربية.',
      'hi': 'नमस्ते, यह हिंदी में एक आवाज परीक्षण है।'
    };

    try {
      await this.speak(testTexts[languageCode] || testTexts['en'], {
        language: this.getLanguageTag(languageCode),
        rate: 1.0,
        volume: 0.5
      });
      return true;
    } catch (error) {
      console.error('TTS test failed:', error);
      return false;
    }
  }

  // Get TTS capabilities
  getCapabilities(): {
    isSupported: boolean;
    voiceCount: number;
    supportedLanguages: string[];
  } {
    const voices = this.getAvailableVoices();
    const supportedLanguages = [...new Set(voices.map(voice => voice.lang))];

    return {
      isSupported: 'speechSynthesis' in window,
      voiceCount: voices.length,
      supportedLanguages
    };
  }
}

export const textToSpeech = new TextToSpeechService();
