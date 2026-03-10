import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export interface ArtooSessionCallbacks {
  onAudioChunk: (base64Audio: string) => void;
  onTranscription: (text: string, isInterim: boolean) => void;
  onModelTurn: (text: string) => void;
  onGenerating: (isGenerating: boolean) => void;
  onError: (error: any) => void;
  onClose: () => void;
}

export class ArtooLiveService {
  private ai: GoogleGenAI;
  private session: any = null;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(callbacks: ArtooSessionCallbacks) {
    const sessionPromise = this.ai.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        systemInstruction: "Sen ARTOO'sun, mühendisler için tasarlanmış son derece gelişmiş bir sanal asistansın. Kısa, teknik ve yardımseversin. Kamera aracılığıyla görebilir ve mikrofon aracılığıyla duyabilirsin. Gerçek zamanlı analiz ve destek sağla. Tüm cevaplarını Türkçe olarak ver.",
      },
      callbacks: {
        onopen: () => {
          console.log("ARTOO Live Session Opened");
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.modelTurn?.parts) {
            callbacks.onGenerating(true);
            const audioPart = message.serverContent.modelTurn.parts.find(p => p.inlineData);
            const textPart = message.serverContent.modelTurn.parts.find(p => p.text);
            
            if (audioPart?.inlineData?.data) {
              callbacks.onAudioChunk(audioPart.inlineData.data);
            }
            if (textPart?.text) {
              callbacks.onModelTurn(textPart.text);
            }
          }

          if (message.serverContent?.turnComplete) {
            callbacks.onGenerating(false);
          }

          if (message.serverContent?.interrupted) {
            callbacks.onGenerating(false);
          }
        },
        onerror: (error) => callbacks.onError(error),
        onclose: () => callbacks.onClose(),
      },
    });

    this.session = await sessionPromise;
    return this.session;
  }

  sendAudio(base64Data: string) {
    if (this.session) {
      this.session.sendRealtimeInput({
        media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    }
  }

  sendVideoFrame(base64Data: string) {
    if (this.session) {
      this.session.sendRealtimeInput({
        media: { data: base64Data, mimeType: 'image/jpeg' }
      });
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }
}
