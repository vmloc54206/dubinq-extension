# 🔑 API Setup Guide

## 🚀 **Quick Start (No API needed)**

Extension hiện tại đã có **fallback methods** để hoạt động mà không cần API:

### ✅ **Tính năng hoạt động ngay:**
- **DOM extraction** - Lấy subtitle từ YouTube DOM
- **Video track extraction** - Lấy từ HTML5 video tracks  
- **Mock subtitles** - Data mẫu để test translation
- **Google Translate (unofficial)** - Không cần API key
- **Text-to-Speech** - Web Speech API built-in

### 🧪 **Test ngay:**
1. **Load extension** vào Chrome
2. **Mở YouTube video** có subtitle
3. **Click "Bắt đầu dịch thuật"**
4. Extension sẽ tự động:
   - Detect video info từ DOM
   - Extract subtitles (hoặc dùng mock data)
   - Translate bằng Google Translate
   - Play audio bằng TTS

---

## 🔧 **Optional: YouTube Data API v3 (For better performance)**

### **Bước 1: Tạo Google Cloud Project**
1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới: "YouTube Translator"
3. Enable **YouTube Data API v3**

### **Bước 2: Tạo API Key**
1. Vào **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **API Key**
3. Copy API key
4. **Restrict key**: Chỉ cho YouTube Data API v3

### **Bước 3: Thêm vào project**
```bash
# Sửa file .env
YOUTUBE_API_KEY=your_actual_api_key_here
```

### **Bước 4: Rebuild**
```bash
pnpm build
```

---

## 🌐 **Optional: Google Translate API (For better translation)**

### **Setup:**
1. Enable **Cloud Translation API** trong Google Cloud
2. Tạo **Service Account** và download JSON key
3. Thêm vào .env:
```bash
GOOGLE_TRANSLATE_API_KEY=your_translate_api_key
```

### **Benefits:**
- **Higher quality** translations
- **More languages** supported
- **No rate limits** (paid)
- **Batch translation** faster

---

## 🔍 **Troubleshooting**

### **"Không lấy được subtitle":**
1. **Kiểm tra video có subtitle không:**
   - Click CC button trên YouTube player
   - Thử video khác có subtitle rõ ràng

2. **Check console logs:**
   - F12 → Console tab
   - Xem logs từ YouTube API service

3. **Fallback methods:**
   - Extension sẽ tự động dùng mock data
   - Translation vẫn hoạt động để test

### **Translation không hoạt động:**
1. **Check internet connection**
2. **Try different language pairs**
3. **Check console for errors**

### **TTS không phát:**
1. **Check browser permissions**
2. **Try different voices**
3. **Check volume settings**

---

## 📊 **Current Status:**

### ✅ **Working without API:**
- Video detection ✅
- DOM subtitle extraction ✅  
- Mock subtitle generation ✅
- Google Translate (unofficial) ✅
- Text-to-Speech ✅
- Modern UI ✅

### 🔧 **Enhanced with API:**
- Real subtitle extraction 🔄
- Better translation quality 🔄
- More language options 🔄
- Faster processing 🔄

**Extension hoạt động ngay mà không cần setup API!** 🎉
