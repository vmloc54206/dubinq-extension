// YouTube Content Script - Inject translator vào YouTube

import React from 'react';
import { createRoot } from 'react-dom/client';
import { TranslatorPanel } from '../components/TranslatorPanel';
import { youtubeAPI } from '../services/youtube-api';
import { translator } from '../services/translator';
import { textToSpeech } from '../services/text-to-speech';
import { subtitleParser } from '../services/subtitle-parser';
import { storageManager } from '../utils/storage';
import { YOUTUBE_SELECTORS, PATTERNS, MESSAGE_TYPES } from '../utils/constants';
import type { SubtitleEntry, ExtensionMessage } from '../types';

class YouTubeTranslatorInjector {
  private translatorContainer: HTMLElement | null = null;
  private translatorRoot: any = null;
  private currentVideoId: string | null = null;
  private subtitleObserver: MutationObserver | null = null;
  private videoObserver: MutationObserver | null = null;
  private currentSubtitles: SubtitleEntry[] = [];
  private isActive: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    // Đợi trang load xong
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  private async setup() {
    // Kiểm tra xem có phải trang YouTube không
    if (!this.isYouTubePage()) {
      return;
    }

    // Kiểm tra extension có được enable không
    const isEnabled = await storageManager.getIsEnabled();
    if (!isEnabled) {
      return;
    }

    // Setup observers
    this.setupVideoObserver();
    this.setupURLChangeListener();
    
    // Inject translator nếu đang ở video page
    if (this.isVideoPage()) {
      this.injectTranslator();
    }

    console.log('YouTube Translator injected successfully');
  }

  private isYouTubePage(): boolean {
    return window.location.hostname.includes('youtube.com');
  }

  private isVideoPage(): boolean {
    return window.location.pathname === '/watch';
  }

  private getCurrentVideoId(): string | null {
    const url = window.location.href;
    const match = url.match(PATTERNS.YOUTUBE_VIDEO_ID);
    return match ? match[1] : null;
  }

  private setupVideoObserver() {
    // Theo dõi thay đổi video player
    this.videoObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const videoId = this.getCurrentVideoId();
          if (videoId && videoId !== this.currentVideoId) {
            this.currentVideoId = videoId;
            this.onVideoChanged(videoId);
          }
        }
      });
    });

    // Observe document body
    this.videoObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private setupURLChangeListener() {
    // Theo dõi thay đổi URL (YouTube SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        this.onURLChanged();
      }
    }).observe(document, { subtree: true, childList: true });
  }

  private onURLChanged() {
    if (this.isVideoPage()) {
      const videoId = this.getCurrentVideoId();
      if (videoId !== this.currentVideoId) {
        this.currentVideoId = videoId;
        this.injectTranslator();
      }
    } else {
      this.removeTranslator();
    }
  }

  private onVideoChanged(videoId: string) {
    if (this.isVideoPage()) {
      this.updateTranslatorVideoId(videoId);
      this.setupSubtitleObserver();
    }
  }

  private injectTranslator() {
    // Tìm vị trí để inject translator
    const targetContainer = this.findInjectionTarget();
    if (!targetContainer) {
      console.warn('Could not find injection target');
      return;
    }

    // Tạo container cho translator
    this.createTranslatorContainer(targetContainer);
    
    // Render React component
    this.renderTranslatorPanel();

    // Setup subtitle observer
    this.setupSubtitleObserver();
  }

  private findInjectionTarget(): HTMLElement | null {
    // Thử các selector khác nhau để tìm vị trí phù hợp
    const selectors = [
      '#secondary', // Sidebar
      '#secondary-inner',
      '.ytd-watch-flexy[role="main"]',
      '#columns'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        return element;
      }
    }

    return null;
  }

  private createTranslatorContainer(parent: HTMLElement) {
    // Remove existing container
    this.removeTranslator();

    // Create new container
    this.translatorContainer = document.createElement('div');
    this.translatorContainer.id = 'youtube-translator-panel';
    this.translatorContainer.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    document.body.appendChild(this.translatorContainer);
  }

  private renderTranslatorPanel() {
    if (!this.translatorContainer) return;

    // Create React root
    this.translatorRoot = createRoot(this.translatorContainer);
    
    // Render component
    this.translatorRoot.render(
      <TranslatorPanel 
        videoId={this.currentVideoId || undefined}
        onClose={() => this.removeTranslator()}
      />
    );
  }

  private updateTranslatorVideoId(videoId: string) {
    if (this.translatorRoot && this.translatorContainer) {
      this.translatorRoot.render(
        <TranslatorPanel 
          videoId={videoId}
          onClose={() => this.removeTranslator()}
        />
      );
    }
  }

  private removeTranslator() {
    if (this.translatorRoot) {
      this.translatorRoot.unmount();
      this.translatorRoot = null;
    }

    if (this.translatorContainer) {
      this.translatorContainer.remove();
      this.translatorContainer = null;
    }

    this.stopSubtitleObserver();
  }

  private setupSubtitleObserver() {
    this.stopSubtitleObserver();

    // Tìm subtitle container
    const subtitleContainer = document.querySelector(YOUTUBE_SELECTORS.SUBTITLE_CONTAINER);
    if (!subtitleContainer) {
      console.warn('Subtitle container not found');
      return;
    }

    // Observe subtitle changes
    this.subtitleObserver = youtubeAPI.observeSubtitleChanges((subtitle) => {
      this.onSubtitleUpdate(subtitle);
    });
  }

  private stopSubtitleObserver() {
    if (this.subtitleObserver) {
      this.subtitleObserver.disconnect();
      this.subtitleObserver = null;
    }
  }

  private async onSubtitleUpdate(subtitle: SubtitleEntry) {
    if (!this.isActive) return;

    try {
      // Lấy settings
      const settings = await storageManager.getSettings();
      
      // Dịch subtitle
      const translatedSubtitle = await translator.translateRealtime(
        subtitle,
        settings.targetLanguage,
        settings.sourceLanguage
      );

      // Phát audio nếu được enable
      if (settings.enableTTS && translatedSubtitle.translatedText) {
        await textToSpeech.speakSubtitle(
          translatedSubtitle,
          settings.targetLanguage,
          {
            rate: settings.ttsSpeed,
            volume: 0.8
          }
        );
      }

      // Cập nhật UI (có thể gửi message đến panel)
      this.updateCurrentSubtitle(translatedSubtitle);

    } catch (error) {
      console.error('Error processing subtitle:', error);
    }
  }

  private updateCurrentSubtitle(subtitle: SubtitleEntry) {
    // Có thể implement custom subtitle overlay ở đây
    // Hoặc gửi message đến TranslatorPanel
  }

  // Public methods để control từ extension
  public activate() {
    this.isActive = true;
  }

  public deactivate() {
    this.isActive = false;
    textToSpeech.stop();
  }

  public isActivated(): boolean {
    return this.isActive;
  }

  // Message listener
  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
      switch (message.type) {
        case MESSAGE_TYPES.TOGGLE_TRANSLATOR:
          if (this.isActive) {
            this.deactivate();
          } else {
            this.activate();
          }
          sendResponse({ success: true, isActive: this.isActive });
          break;

        case MESSAGE_TYPES.GET_VIDEO_INFO:
          const videoId = this.getCurrentVideoId();
          sendResponse({ 
            videoId,
            isVideoPage: this.isVideoPage(),
            hasTranslator: !!this.translatorContainer
          });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    });
  }
}

// Initialize injector
const injector = new YouTubeTranslatorInjector();

// Export for debugging
(window as any).youtubeTranslator = injector;
