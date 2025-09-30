// Constants cho YouTube Realtime Translator

export const YOUTUBE_SELECTORS = {
  VIDEO_PLAYER: 'video',
  VIDEO_CONTAINER: '#movie_player',
  SUBTITLE_CONTAINER: '.ytp-caption-window-container',
  SUBTITLE_TEXT: '.captions-text',
  VIDEO_TITLE: 'h1.title',
  PROGRESS_BAR: '.ytp-progress-bar'
} as const;

export const API_ENDPOINTS = {
  YOUTUBE_CAPTIONS: 'https://www.googleapis.com/youtube/v3/captions',
  YOUTUBE_VIDEOS: 'https://www.googleapis.com/youtube/v3/videos'
} as const;

export const DEFAULT_SETTINGS = {
  sourceLanguage: 'auto',
  targetLanguage: 'vi',
  autoDetect: true,
  enableTTS: true,
  ttsSpeed: 1.0,
  ttsVoice: 'default'
} as const;

export const STORAGE_KEYS = {
  SETTINGS: 'translator_settings',
  RECENT_LANGUAGES: 'recent_languages',
  IS_ENABLED: 'is_enabled'
} as const;

export const MESSAGE_TYPES = {
  TRANSLATE_SUBTITLE: 'TRANSLATE_SUBTITLE',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  GET_VIDEO_INFO: 'GET_VIDEO_INFO',
  TOGGLE_TRANSLATOR: 'TOGGLE_TRANSLATOR',
  SUBTITLE_UPDATE: 'SUBTITLE_UPDATE'
} as const;

export const TTS_VOICES = {
  'vi': ['vi-VN-Standard-A', 'vi-VN-Standard-B', 'vi-VN-Standard-C', 'vi-VN-Standard-D'],
  'en': ['en-US-Standard-A', 'en-US-Standard-B', 'en-US-Standard-C', 'en-US-Standard-D'],
  'ja': ['ja-JP-Standard-A', 'ja-JP-Standard-B', 'ja-JP-Standard-C', 'ja-JP-Standard-D'],
  'ko': ['ko-KR-Standard-A', 'ko-KR-Standard-B', 'ko-KR-Standard-C', 'ko-KR-Standard-D']
} as const;

export const SUBTITLE_FORMATS = {
  SRT: 'srt',
  VTT: 'vtt',
  TTML: 'ttml'
} as const;

// Regex patterns
export const PATTERNS = {
  YOUTUBE_VIDEO_ID: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  SRT_TIMESTAMP: /(\d{2}):(\d{2}):(\d{2}),(\d{3})/,
  VTT_TIMESTAMP: /(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
} as const;

export const DEBOUNCE_DELAYS = {
  SUBTITLE_UPDATE: 100,
  TRANSLATION: 300,
  SETTINGS_SAVE: 500
} as const;
