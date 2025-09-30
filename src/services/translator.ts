// Google Translate Service để dịch text

import type { SubtitleEntry, LanguageCode } from '../types';

// Interface cho translation result
interface TranslationResult {
  translatedText: string;
  sourceLanguage?: string;
  confidence?: number;
}

// Interface cho batch translation
interface BatchTranslationResult {
  translations: TranslationResult[];
  totalTokens?: number;
}

class TranslatorService {
  private apiKey: string = '';
  private cache: Map<string, TranslationResult> = new Map();
  private rateLimitDelay: number = 100; // ms between requests

  constructor() {
    // API key sẽ được set từ environment hoặc user input
    this.apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || '';
  }

  // Set API key
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  // Dịch một đoạn text
  async translateText(
    text: string, 
    targetLanguage: LanguageCode, 
    sourceLanguage: LanguageCode | 'auto' = 'auto'
  ): Promise<TranslationResult> {
    // Tạo cache key
    const cacheKey = `${text}|${sourceLanguage}|${targetLanguage}`;
    
    // Kiểm tra cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      let result: TranslationResult;

      if (this.apiKey) {
        // Sử dụng Google Translate API chính thức
        result = await this.translateWithOfficialAPI(text, targetLanguage, sourceLanguage);
      } else {
        // Sử dụng unofficial API (google-translate-api-x)
        result = await this.translateWithUnofficialAPI(text, targetLanguage, sourceLanguage);
      }

      // Lưu vào cache
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Translation error:', error);
      return {
        translatedText: text, // Fallback: trả về text gốc
        sourceLanguage: sourceLanguage === 'auto' ? undefined : sourceLanguage
      };
    }
  }

  // Dịch sử dụng Google Translate API chính thức
  private async translateWithOfficialAPI(
    text: string,
    targetLanguage: LanguageCode,
    sourceLanguage: LanguageCode | 'auto'
  ): Promise<TranslationResult> {
    const url = 'https://translation.googleapis.com/language/translate/v2';
    
    const requestBody = {
      q: text,
      target: targetLanguage,
      ...(sourceLanguage !== 'auto' && { source: sourceLanguage }),
      key: this.apiKey
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const translation = data.data.translations[0];

    return {
      translatedText: translation.translatedText,
      sourceLanguage: translation.detectedSourceLanguage || sourceLanguage,
    };
  }

  // Dịch sử dụng unofficial API
  private async translateWithUnofficialAPI(
    text: string,
    targetLanguage: LanguageCode,
    sourceLanguage: LanguageCode | 'auto'
  ): Promise<TranslationResult> {
    // Import dynamic để tránh lỗi khi build
    const { translate } = await import('google-translate-api-x');

    const result = await translate(text, {
      from: sourceLanguage,
      to: targetLanguage
    });

    return {
      translatedText: result.text,
      sourceLanguage: result.from?.language?.iso || sourceLanguage,
      confidence: result.from?.text?.autoCorrected ? 0.8 : 0.9
    };
  }

  // Dịch batch subtitles
  async translateSubtitles(
    subtitles: SubtitleEntry[],
    targetLanguage: LanguageCode,
    sourceLanguage: LanguageCode | 'auto' = 'auto',
    onProgress?: (progress: number) => void
  ): Promise<SubtitleEntry[]> {
    const translatedSubtitles: SubtitleEntry[] = [];
    const total = subtitles.length;

    for (let i = 0; i < subtitles.length; i++) {
      const subtitle = subtitles[i];
      
      try {
        const result = await this.translateText(subtitle.text, targetLanguage, sourceLanguage);
        
        translatedSubtitles.push({
          ...subtitle,
          translatedText: result.translatedText
        });

        // Báo cáo progress
        if (onProgress) {
          onProgress((i + 1) / total);
        }

        // Rate limiting
        if (i < subtitles.length - 1) {
          await this.delay(this.rateLimitDelay);
        }
      } catch (error) {
        console.error(`Error translating subtitle ${i}:`, error);
        
        // Fallback: giữ nguyên text gốc
        translatedSubtitles.push({
          ...subtitle,
          translatedText: subtitle.text
        });
      }
    }

    return translatedSubtitles;
  }

  // Dịch realtime cho subtitle hiện tại
  async translateRealtime(
    subtitle: SubtitleEntry,
    targetLanguage: LanguageCode,
    sourceLanguage: LanguageCode | 'auto' = 'auto'
  ): Promise<SubtitleEntry> {
    try {
      const result = await this.translateText(subtitle.text, targetLanguage, sourceLanguage);
      
      return {
        ...subtitle,
        translatedText: result.translatedText
      };
    } catch (error) {
      console.error('Realtime translation error:', error);
      return {
        ...subtitle,
        translatedText: subtitle.text
      };
    }
  }

  // Detect ngôn ngữ của text
  async detectLanguage(text: string): Promise<LanguageCode | null> {
    try {
      if (this.apiKey) {
        return await this.detectLanguageWithOfficialAPI(text);
      } else {
        return await this.detectLanguageWithUnofficialAPI(text);
      }
    } catch (error) {
      console.error('Language detection error:', error);
      return null;
    }
  }

  // Detect ngôn ngữ với official API
  private async detectLanguageWithOfficialAPI(text: string): Promise<LanguageCode | null> {
    const url = 'https://translation.googleapis.com/language/translate/v2/detect';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        key: this.apiKey
      })
    });

    if (!response.ok) {
      throw new Error(`Detection API error: ${response.status}`);
    }

    const data = await response.json();
    const detection = data.data.detections[0][0];
    
    return detection.language as LanguageCode;
  }

  // Detect ngôn ngữ với unofficial API
  private async detectLanguageWithUnofficialAPI(text: string): Promise<LanguageCode | null> {
    const { translate } = await import('google-translate-api-x');

    const result = await translate(text, { to: 'en' });
    return result.from?.language?.iso as LanguageCode || null;
  }

  // Lấy danh sách ngôn ngữ được hỗ trợ
  getSupportedLanguages(): LanguageCode[] {
    return [
      'vi', 'en', 'ja', 'ko', 'zh', 'th', 'fr', 'de', 'es', 'ru', 'ar', 'hi',
      'it', 'pt', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'tr', 'he', 'id', 'ms'
    ];
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache size
  getCacheSize(): number {
    return this.cache.size;
  }

  // Set rate limit delay
  setRateLimitDelay(delay: number): void {
    this.rateLimitDelay = delay;
  }

  // Utility: delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Optimize text for translation (remove unnecessary characters, normalize)
  private optimizeTextForTranslation(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\p{P}]/gu, '') // Remove special characters except punctuation
      .trim();
  }

  // Split long text into chunks for better translation
  splitTextIntoChunks(text: string, maxLength: number = 1000): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= maxLength) {
        currentChunk += sentence + '.';
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence + '.';
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

export const translator = new TranslatorService();
