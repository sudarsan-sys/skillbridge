import { Platform } from 'react-native';
import { SupportedLanguage, SUPPORTED_LANGUAGES } from './language';

// For React Native, we'll use a simple TTS implementation
// In a real app, you would install expo-speech or react-native-tts
class TextToSpeechService {
  private isPlaying = false;
  private currentUtterance: any = null;

  async speak(text: string, language: SupportedLanguage = 'en'): Promise<void> {
    try {
      // Stop any current speech
      this.stop();

      const languageConfig = SUPPORTED_LANGUAGES[language];
      
      if (Platform.OS === 'web') {
        // Web implementation using SpeechSynthesis API
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = languageConfig.ttsVoice || 'en-US';
          utterance.rate = 0.8;
          utterance.pitch = 1;
          
          utterance.onstart = () => {
            this.isPlaying = true;
          };
          
          utterance.onend = () => {
            this.isPlaying = false;
            this.currentUtterance = null;
          };
          
          utterance.onerror = (error) => {
            console.error('TTS Error:', error);
            this.isPlaying = false;
            this.currentUtterance = null;
          };

          this.currentUtterance = utterance;
          window.speechSynthesis.speak(utterance);
        } else {
          console.warn('Speech synthesis not supported in this browser');
        }
      } else {
        // For mobile platforms, we'll simulate TTS
        // In a real implementation, you would use expo-speech or react-native-tts
        console.log(`TTS: Speaking "${text}" in ${language}`);
        this.isPlaying = true;
        
        // Simulate speech duration (roughly 150 words per minute)
        const words = text.split(' ').length;
        const duration = (words / 150) * 60 * 1000; // Convert to milliseconds
        
        setTimeout(() => {
          this.isPlaying = false;
          this.currentUtterance = null;
        }, Math.max(duration, 1000)); // Minimum 1 second
      }
    } catch (error) {
      console.error('Error in TTS speak:', error);
      this.isPlaying = false;
    }
  }

  stop(): void {
    try {
      if (Platform.OS === 'web' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      this.isPlaying = false;
      this.currentUtterance = null;
    } catch (error) {
      console.error('Error stopping TTS:', error);
    }
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  async getAvailableVoices(): Promise<any[]> {
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      return new Promise((resolve) => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          resolve(voices);
        } else {
          // Wait for voices to load
          window.speechSynthesis.onvoiceschanged = () => {
            resolve(window.speechSynthesis.getVoices());
          };
        }
      });
    }
    return [];
  }
}

export const ttsService = new TextToSpeechService();

// Hook for using TTS in components
export const useTTS = () => {
  const speak = (text: string, language: SupportedLanguage = 'en') => {
    return ttsService.speak(text, language);
  };

  const stop = () => {
    ttsService.stop();
  };

  const isPlaying = () => {
    return ttsService.isCurrentlyPlaying();
  };

  return {
    speak,
    stop,
    isPlaying,
  };
};
