// Subtitle Parser Service để parse SRT, VTT và các format khác

import type { SubtitleEntry } from '../types';
import { PATTERNS } from '../utils/constants';

class SubtitleParserService {
  // Parse SRT format
  parseSRT(srtContent: string): SubtitleEntry[] {
    const subtitles: SubtitleEntry[] = [];
    const blocks = srtContent.trim().split(/\n\s*\n/);

    blocks.forEach((block, index) => {
      const lines = block.trim().split('\n');
      if (lines.length < 3) return;

      const timecodeLine = lines[1];
      const textLines = lines.slice(2);

      const timeMatch = timecodeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      
      if (timeMatch) {
        const startTime = this.timeToSeconds(
          parseInt(timeMatch[1]), // hours
          parseInt(timeMatch[2]), // minutes
          parseInt(timeMatch[3]), // seconds
          parseInt(timeMatch[4])  // milliseconds
        );

        const endTime = this.timeToSeconds(
          parseInt(timeMatch[5]), // hours
          parseInt(timeMatch[6]), // minutes
          parseInt(timeMatch[7]), // seconds
          parseInt(timeMatch[8])  // milliseconds
        );

        subtitles.push({
          id: `srt-${index}`,
          start: startTime,
          end: endTime,
          text: textLines.join(' ').replace(/<[^>]*>/g, '') // Remove HTML tags
        });
      }
    });

    return subtitles;
  }

  // Parse VTT format
  parseVTT(vttContent: string): SubtitleEntry[] {
    const subtitles: SubtitleEntry[] = [];
    const lines = vttContent.split('\n');
    let currentSubtitle: Partial<SubtitleEntry> = {};
    let index = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip WEBVTT header and empty lines
      if (line === 'WEBVTT' || line === '' || line.startsWith('NOTE')) {
        continue;
      }

      // Check for timestamp line
      const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
      
      if (timeMatch) {
        const startTime = this.timeToSeconds(
          parseInt(timeMatch[1]), // hours
          parseInt(timeMatch[2]), // minutes
          parseInt(timeMatch[3]), // seconds
          parseInt(timeMatch[4])  // milliseconds
        );

        const endTime = this.timeToSeconds(
          parseInt(timeMatch[5]), // hours
          parseInt(timeMatch[6]), // minutes
          parseInt(timeMatch[7]), // seconds
          parseInt(timeMatch[8])  // milliseconds
        );

        currentSubtitle = {
          id: `vtt-${index}`,
          start: startTime,
          end: endTime,
          text: ''
        };

        // Collect text lines until next timestamp or end
        const textLines: string[] = [];
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine === '' || nextLine.match(/\d{2}:\d{2}:\d{2}\.\d{3}/)) {
            break;
          }
          textLines.push(nextLine);
        }

        currentSubtitle.text = textLines.join(' ').replace(/<[^>]*>/g, ''); // Remove HTML tags
        
        if (currentSubtitle.text) {
          subtitles.push(currentSubtitle as SubtitleEntry);
          index++;
        }
      }
    }

    return subtitles;
  }

  // Parse TTML/XML format (YouTube captions)
  parseTTML(ttmlContent: string): SubtitleEntry[] {
    const subtitles: SubtitleEntry[] = [];
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(ttmlContent, 'text/xml');
      const textElements = xmlDoc.querySelectorAll('text, p');

      textElements.forEach((element, index) => {
        const start = element.getAttribute('start') || element.getAttribute('t');
        const dur = element.getAttribute('dur') || element.getAttribute('d');
        const text = element.textContent?.trim();

        if (start && text) {
          const startTime = this.parseTimeAttribute(start);
          const duration = dur ? this.parseTimeAttribute(dur) : 5; // Default 5 seconds
          const endTime = startTime + duration;

          subtitles.push({
            id: `ttml-${index}`,
            start: startTime,
            end: endTime,
            text: text.replace(/\s+/g, ' ') // Normalize whitespace
          });
        }
      });
    } catch (error) {
      console.error('Error parsing TTML:', error);
    }

    return subtitles;
  }

  // Auto-detect format và parse
  parseSubtitles(content: string): SubtitleEntry[] {
    const trimmedContent = content.trim();

    // Detect format
    if (trimmedContent.startsWith('WEBVTT')) {
      return this.parseVTT(content);
    } else if (trimmedContent.includes('<?xml') || trimmedContent.includes('<tt ') || trimmedContent.includes('<transcript>')) {
      return this.parseTTML(content);
    } else if (/^\d+\s*\n\d{2}:\d{2}:\d{2},\d{3}/.test(trimmedContent)) {
      return this.parseSRT(content);
    } else {
      console.warn('Unknown subtitle format, trying SRT parser');
      return this.parseSRT(content);
    }
  }

  // Convert time components to seconds
  private timeToSeconds(hours: number, minutes: number, seconds: number, milliseconds: number): number {
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  // Parse time attribute (supports various formats)
  private parseTimeAttribute(timeStr: string): number {
    // Format: "12.345s" or "12345ms" or "00:01:23.456"
    if (timeStr.endsWith('s')) {
      return parseFloat(timeStr.slice(0, -1));
    } else if (timeStr.endsWith('ms')) {
      return parseFloat(timeStr.slice(0, -2)) / 1000;
    } else if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
      } else if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return parseInt(minutes) * 60 + parseFloat(seconds);
      }
    }
    
    // Fallback: try to parse as float
    return parseFloat(timeStr) || 0;
  }

  // Tìm subtitle tại thời điểm cụ thể
  findSubtitleAtTime(subtitles: SubtitleEntry[], currentTime: number): SubtitleEntry | null {
    return subtitles.find(subtitle => 
      currentTime >= subtitle.start && currentTime <= subtitle.end
    ) || null;
  }

  // Lấy subtitle tiếp theo
  getNextSubtitle(subtitles: SubtitleEntry[], currentTime: number): SubtitleEntry | null {
    return subtitles.find(subtitle => subtitle.start > currentTime) || null;
  }

  // Merge các subtitle gần nhau (để tối ưu hóa dịch thuật)
  mergeNearbySubtitles(subtitles: SubtitleEntry[], maxGap: number = 1): SubtitleEntry[] {
    if (subtitles.length === 0) return [];

    const merged: SubtitleEntry[] = [];
    let current = { ...subtitles[0] };

    for (let i = 1; i < subtitles.length; i++) {
      const next = subtitles[i];
      
      // Nếu khoảng cách giữa 2 subtitle nhỏ hơn maxGap giây
      if (next.start - current.end <= maxGap) {
        // Merge với subtitle hiện tại
        current.end = next.end;
        current.text += ' ' + next.text;
      } else {
        // Lưu subtitle hiện tại và bắt đầu subtitle mới
        merged.push(current);
        current = { ...next };
      }
    }

    // Thêm subtitle cuối cùng
    merged.push(current);

    return merged;
  }

  // Convert subtitle array thành SRT format
  toSRT(subtitles: SubtitleEntry[]): string {
    return subtitles.map((subtitle, index) => {
      const startTime = this.secondsToSRTTime(subtitle.start);
      const endTime = this.secondsToSRTTime(subtitle.end);
      
      return `${index + 1}\n${startTime} --> ${endTime}\n${subtitle.text}\n`;
    }).join('\n');
  }

  // Convert seconds to SRT time format
  private secondsToSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }
}

export const subtitleParser = new SubtitleParserService();
