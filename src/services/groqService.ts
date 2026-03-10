import Groq from "groq-sdk";

export class ArtooGroqService {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey, dangerouslyAllowBrowser: true });
  }

  async transcribe(audioBlob: Blob, mimeType: string): Promise<string> {
    const extension = mimeType.includes('webm') ? 'webm' : 'm4a';
    const file = new File([audioBlob], `recording.${extension}`, { type: mimeType });
    const transcription = await this.client.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
      language: "tr",
    });
    return transcription.text;
  }

  async chat(prompt: string, imageBase64?: string): Promise<string> {
    const messages: any[] = [
      {
        role: "system",
        content: "Sen ARTOO'sun, mühendisler için tasarlanmış son derece gelişmiş bir sanal asistansın. Kısa, teknik ve yardımseversin. Tüm cevaplarını Türkçe olarak ver.",
      },
    ];

    if (imageBase64) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt || "Bu görseli analiz et." },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      });
      
      const completion = await this.client.chat.completions.create({
        messages,
        model: "llama-3.2-11b-vision-preview",
      });
      return completion.choices[0].message.content || "";
    } else {
      messages.push({ role: "user", content: prompt });
      const completion = await this.client.chat.completions.create({
        messages,
        model: "qwen-2.5-72b",
      });
      return completion.choices[0].message.content || "";
    }
  }
}
