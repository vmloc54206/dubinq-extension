# 🎤 Web Speech API - Text-to-Speech Support

## ✅ **Extension ĐÃ DÙNG Web Speech API!**

### **🔊 Text-to-Speech (TTS) Features:**

Extension hiện tại đã tích hợp **Web Speech API** để đọc subtitle đã dịch!

---

## 📊 **Web Speech API là gì?**

### **🎯 Định nghĩa:**
```
Web Speech API = Browser API cho Speech Recognition & Speech Synthesis
- Speech Recognition: Nhận diện giọng nói → Text
- Speech Synthesis: Text → Giọng nói (TTS) ✅ Extension đang dùng
```

### **✅ Đặc điểm:**
```
✅ MIỄN PHÍ 100% - Built-in browser
✅ Không cần API key
✅ Không cần internet (local voices)
✅ Hỗ trợ 50+ ngôn ngữ
✅ Multiple voices per language
✅ Adjustable speed, pitch, volume
```

---

## 🚀 **Extension đang dùng như thế nào?**

### **📁 File: `src/services/text-to-speech.ts`**

<augment_code_snippet path="src/services/text-to-speech.ts" mode="EXCERPT">
````typescript
class TextToSpeechService {
  private synthesis: SpeechSynthesis;
  
  constructor() {
    this.synthesis = window.speechSynthesis; // ✅ Web Speech API
  }
  
  async speak(text: string, options: TTSOptions): Promise<void> {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.language;
    utterance.rate = options.rate;
    utterance.pitch = options.pitch;
    utterance.volume = options.volume;
    
    this.synthesis.speak(utterance); // ✅ Phát giọng nói
  }
}
````
</augment_code_snippet>

---

## 🌍 **Ngôn ngữ được hỗ trợ:**

### **✅ Web Speech API hỗ trợ 50+ ngôn ngữ:**

#### **🌏 Châu Á:**
```
vi-VN    ✅ Tiếng Việt
en-US    ✅ English (US)
en-GB    ✅ English (UK)
ja-JP    ✅ 日本語
ko-KR    ✅ 한국어
zh-CN    ✅ 中文 (简体)
zh-TW    ✅ 中文 (繁體)
zh-HK    ✅ 中文 (香港)
th-TH    ✅ ไทย
hi-IN    ✅ हिन्दी
id-ID    ✅ Bahasa Indonesia
ms-MY    ✅ Bahasa Melayu
fil-PH   ✅ Filipino
bn-BD    ✅ বাংলা
ta-IN    ✅ தமிழ்
te-IN    ✅ తెలుగు
```

#### **🌍 Châu Âu:**
```
fr-FR    ✅ Français
de-DE    ✅ Deutsch
es-ES    ✅ Español
it-IT    ✅ Italiano
pt-PT    ✅ Português
pt-BR    ✅ Português (Brasil)
ru-RU    ✅ Русский
pl-PL    ✅ Polski
nl-NL    ✅ Nederlands
sv-SE    ✅ Svenska
no-NO    ✅ Norsk
da-DK    ✅ Dansk
fi-FI    ✅ Suomi
cs-CZ    ✅ Čeština
sk-SK    ✅ Slovenčina
hu-HU    ✅ Magyar
ro-RO    ✅ Română
el-GR    ✅ Ελληνικά
tr-TR    ✅ Türkçe
```

#### **🌍 Trung Đông:**
```
ar-SA    ✅ العربية
he-IL    ✅ עברית
```

---

## 🎯 **Features hiện tại:**

### **✅ 1. Basic TTS:**
<augment_code_snippet path="src/services/text-to-speech.ts" mode="EXCERPT">
````typescript
// Đọc text đơn giản
await textToSpeech.speak("Xin chào", {
  language: 'vi-VN',
  rate: 1.0,      // Tốc độ (0.1 - 10)
  pitch: 1.0,     // Cao độ (0 - 2)
  volume: 0.8     // Âm lượng (0 - 1)
});
````
</augment_code_snippet>

### **✅ 2. Subtitle TTS:**
<augment_code_snippet path="src/services/text-to-speech.ts" mode="EXCERPT">
````typescript
// Đọc subtitle đã dịch
await textToSpeech.speakSubtitle(
  subtitle,
  'vi',  // Target language
  { rate: 1.0, volume: 0.8 }
);
````
</augment_code_snippet>

### **✅ 3. Voice Selection:**
<augment_code_snippet path="src/services/text-to-speech.ts" mode="EXCERPT">
````typescript
// Lấy voices cho ngôn ngữ
const voices = textToSpeech.getVoicesForLanguage('vi');

// Tự động chọn voice tốt nhất
const bestVoice = textToSpeech.getBestVoiceForLanguage('vi');
// Ưu tiên: Local voice > Default voice > First voice
````
</augment_code_snippet>

### **✅ 4. Playback Controls:**
<augment_code_snippet path="src/services/text-to-speech.ts" mode="EXCERPT">
````typescript
textToSpeech.pause();   // Tạm dừng
textToSpeech.resume();  // Tiếp tục
textToSpeech.stop();    // Dừng hẳn
textToSpeech.isSpeaking(); // Check đang phát
textToSpeech.isPaused();   // Check đang pause
````
</augment_code_snippet>

### **✅ 5. Queue System:**
<augment_code_snippet path="src/services/text-to-speech.ts" mode="EXCERPT">
````typescript
// Thêm vào queue
textToSpeech.queueSubtitle(subtitle1, 'vi');
textToSpeech.queueSubtitle(subtitle2, 'vi');

// Xử lý queue tuần tự
textToSpeech.processQueue();

// Clear queue
textToSpeech.clearQueue();
````
</augment_code_snippet>

---

## 🎨 **UI Components:**

### **📁 File: `src/components/AudioControls.tsx`**

<augment_code_snippet path="src/components/AudioControls.tsx" mode="EXCERPT">
````typescript
export const AudioControls: React.FC = () => {
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  useEffect(() => {
    // Load voices khi component mount
    const voices = textToSpeech.getAvailableVoices();
    setAvailableVoices(voices);
  }, []);
  
  // Play/Pause/Stop controls
  // Speed/Pitch/Volume sliders
  // Voice selection dropdown
}
````
</augment_code_snippet>

---

## 🔧 **Integration với Realtime Processor:**

### **📁 File: `src/services/realtime-processor.ts`**

<augment_code_snippet path="src/services/realtime-processor.ts" mode="EXCERPT">
````typescript
// Tự động đọc subtitle khi video phát
private async handleSubtitleChange(subtitle: SubtitleEntry) {
  // 1. Dịch subtitle
  const translated = await translator.translateRealtime(subtitle, ...);
  
  // 2. Phát audio nếu TTS enabled
  if (this.settings.enableTTS) {
    await textToSpeech.speakSubtitle(translated, targetLang);
  }
}

// Sync với video playback
this.currentVideo.addEventListener('play', () => {
  textToSpeech.resume(); // Resume TTS khi video play
});

this.currentVideo.addEventListener('pause', () => {
  textToSpeech.pause(); // Pause TTS khi video pause
});
````
</augment_code_snippet>

---

## 📊 **Browser Support:**

### **✅ Desktop Browsers:**
```
Chrome/Edge:  ✅ Excellent (50+ voices)
Firefox:      ✅ Good (20+ voices)
Safari:       ✅ Good (30+ voices)
Opera:        ✅ Good (same as Chrome)
```

### **📱 Mobile Browsers:**
```
Chrome Android:  ✅ Good
Safari iOS:      ✅ Good
Samsung Internet: ✅ Good
```

### **🎯 Voice Quality:**
```
Chrome/Edge:  ✅ Google voices (high quality)
Safari:       ✅ Apple voices (high quality)
Firefox:      ✅ eSpeak voices (medium quality)
```

---

## 🚀 **Capabilities:**

### **✅ Extension TTS Features:**

<augment_code_snippet path="src/services/text-to-speech.ts" mode="EXCERPT">
````typescript
getCapabilities(): {
  isSupported: boolean;      // Web Speech API có sẵn?
  voiceCount: number;        // Số lượng voices
  supportedLanguages: string[]; // Ngôn ngữ được hỗ trợ
}

// Example output:
{
  isSupported: true,
  voiceCount: 67,
  supportedLanguages: [
    'vi-VN', 'en-US', 'en-GB', 'ja-JP', 'ko-KR',
    'zh-CN', 'zh-TW', 'fr-FR', 'de-DE', ...
  ]
}
````
</augment_code_snippet>

---

## 💡 **Use Cases:**

### **✅ 1. Real-time Subtitle Reading:**
```
User xem video → Subtitle xuất hiện → Tự động dịch → Đọc bằng TTS
Perfect cho: Học ngôn ngữ, accessibility
```

### **✅ 2. Language Learning:**
```
Nghe phát âm chuẩn của từng câu
Điều chỉnh tốc độ đọc (0.5x - 2x)
Lặp lại từng câu
```

### **✅ 3. Accessibility:**
```
Người khiếm thị có thể nghe subtitle
Người học ngôn ngữ có thể nghe phát âm
```

### **✅ 4. Multitasking:**
```
Nghe video mà không cần nhìn subtitle
Làm việc khác trong khi nghe
```

---

## 🎊 **Kết luận:**

### **✅ Web Speech API trong Extension:**

```
✅ MIỄN PHÍ 100% - No API key needed
✅ 50+ ngôn ngữ - Including Vietnamese
✅ Multiple voices - Choose best quality
✅ Adjustable settings - Speed, pitch, volume
✅ Queue system - Sequential playback
✅ Video sync - Auto pause/resume with video
✅ Browser native - No external dependencies
✅ Offline capable - Local voices work offline
```

### **🌍 Language Support:**
```
Translation: 130+ languages (Google Translate API)
TTS: 50+ languages (Web Speech API)
Combined: Dịch + Đọc cho 50+ ngôn ngữ
```

### **🎯 Perfect Combo:**
```
1. Google Translate API (FREE) → Dịch subtitle
2. Web Speech API (FREE) → Đọc subtitle đã dịch
3. Result: Hoàn toàn MIỄN PHÍ, không cần API key!
```

**Extension có hệ thống TTS hoàn chỉnh với Web Speech API!** 🎤✨
