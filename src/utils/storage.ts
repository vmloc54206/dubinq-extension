// Storage utilities cho extension

import type { StorageData, TranslationSettings } from '../types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants';

class StorageManager {
  // Lấy settings từ storage
  async getSettings(): Promise<TranslationSettings> {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
      return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error getting settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  // Lưu settings vào storage
  async saveSettings(settings: TranslationSettings): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [STORAGE_KEYS.SETTINGS]: settings
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  // Lấy danh sách ngôn ngữ gần đây
  async getRecentLanguages(): Promise<string[]> {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.RECENT_LANGUAGES);
      return result[STORAGE_KEYS.RECENT_LANGUAGES] || [];
    } catch (error) {
      console.error('Error getting recent languages:', error);
      return [];
    }
  }

  // Thêm ngôn ngữ vào danh sách gần đây
  async addRecentLanguage(languageCode: string): Promise<void> {
    try {
      const recentLanguages = await this.getRecentLanguages();
      const updatedLanguages = [
        languageCode,
        ...recentLanguages.filter(lang => lang !== languageCode)
      ].slice(0, 5); // Giữ tối đa 5 ngôn ngữ gần đây

      await chrome.storage.sync.set({
        [STORAGE_KEYS.RECENT_LANGUAGES]: updatedLanguages
      });
    } catch (error) {
      console.error('Error adding recent language:', error);
    }
  }

  // Kiểm tra trạng thái bật/tắt extension
  async getIsEnabled(): Promise<boolean> {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.IS_ENABLED);
      return result[STORAGE_KEYS.IS_ENABLED] ?? true;
    } catch (error) {
      console.error('Error getting enabled status:', error);
      return true;
    }
  }

  // Cập nhật trạng thái bật/tắt extension
  async setIsEnabled(enabled: boolean): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [STORAGE_KEYS.IS_ENABLED]: enabled
      });
    } catch (error) {
      console.error('Error setting enabled status:', error);
    }
  }

  // Lấy toàn bộ dữ liệu storage
  async getAllData(): Promise<StorageData> {
    try {
      const [settings, recentLanguages, isEnabled] = await Promise.all([
        this.getSettings(),
        this.getRecentLanguages(),
        this.getIsEnabled()
      ]);

      return {
        settings,
        recentLanguages,
        isEnabled
      };
    } catch (error) {
      console.error('Error getting all data:', error);
      return {
        settings: DEFAULT_SETTINGS,
        recentLanguages: [],
        isEnabled: true
      };
    }
  }

  // Xóa toàn bộ dữ liệu storage
  async clearAllData(): Promise<void> {
    try {
      await chrome.storage.sync.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  // Lắng nghe thay đổi storage
  onStorageChanged(callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void): void {
    chrome.storage.onChanged.addListener(callback);
  }
}

export const storageManager = new StorageManager();
