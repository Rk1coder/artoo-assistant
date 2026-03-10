import React, { useEffect, useRef, useState } from 'react';
import { Mic, Video, VideoOff, Power, Activity, Terminal, Cpu, Key, Save, Trash2 } from 'lucide-react';
import { ArtooGroqService } from '../services/groqService';
import { R2D2 } from './R2D2';
import { motion, AnimatePresence } from 'motion/react';

export const ArtooAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('OFFLINE');
  const [lastResponse, setLastResponse] = useState('');
  const [apiKey, setApiKey] = useState(localStorage.getItem('ARTOO_API_KEY') || '');
  const [showKeyEntry, setShowKeyEntry] = useState(!localStorage.getItem('ARTOO_API_KEY'));
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const isActiveRef = useRef(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groqService = useRef<ArtooGroqService | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // Attach camera stream when video element is ready
  useEffect(() => {
    if (isCameraOn && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOn, cameraStream]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('ARTOO_API_KEY', apiKey.trim());
      setShowKeyEntry(false);
      setLastResponse('> API ANAHTARI KAYDEDİLDİ. SİSTEM HAZIR.');
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem('ARTOO_API_KEY');
    setApiKey('');
    setShowKeyEntry(true);
    setLastResponse('> API ANAHTARI SİLİNDİ.');
  };

  useEffect(() => {
    return () => {
      stopAudio();
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      window.speechSynthesis.cancel();
    };
  }, [cameraStream]);

  const startAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const mimeType = mediaRecorder.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunks.current, { type: mimeType });
        if (audioBlob.size < 1000) return; // Too short

        setIsGenerating(true);
        try {
          const text = await groqService.current?.transcribe(audioBlob, mimeType);
          if (text) {
            let imageBase64 = undefined;
            if (isCameraOn && videoRef.current && canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, 640, 480);
                imageBase64 = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
              }
            }
            const response = await groqService.current?.chat(text, imageBase64);
            if (response) {
              setLastResponse(response);
              speak(response);
            }
          }
        } catch (err) {
          console.error(err);
          setLastResponse("> HATA: GROQ SERVİSİNE ERİŞİLEMEDİ.");
        }
        setIsGenerating(false);
        
        // Restart recording if still active
        if (isActiveRef.current) {
          audioChunks.current = [];
          try {
            mediaRecorder.current?.start();
            setTimeout(() => {
              if (mediaRecorder.current?.state === 'recording' && isActiveRef.current) {
                mediaRecorder.current.stop();
              }
            }, 4000); // 4 second chunks
          } catch (e) {
            console.error("Restart error:", e);
          }
        }
      };

      mediaRecorder.current.start();
      setTimeout(() => {
        if (mediaRecorder.current?.state === 'recording' && isActiveRef.current) {
          mediaRecorder.current.stop();
        }
      }, 4000);

    } catch (err) {
      console.error("Audio error:", err);
      setLastResponse(`> HATA: SES CİHAZI BULUNAMADI.`);
    }
  };

  const stopAudio = () => {
    mediaRecorder.current?.stop();
    const stream = mediaRecorder.current?.stream;
    stream?.getTracks().forEach(track => track.stop());
  };

  const toggleAssistant = async () => {
    if (isActive) {
      setIsActive(false);
      setStatus('OFFLINE');
      stopAudio();
      window.speechSynthesis.cancel();
    } else {
      if (!apiKey) {
        setShowKeyEntry(true);
        return;
      }
      
      setStatus('AKTİF');
      try {
        groqService.current = new ArtooGroqService(apiKey);
        setIsActive(true);
        startAudio();
        setLastResponse("> ARTOO ÇEKİRDEĞİ (QWEN-2.5) BAŞLATILDI. DİNLİYORUM...");
      } catch (err) {
        setStatus('HATA');
        setLastResponse(`> HATA: GROQ BAĞLANTISI KURULAMADI.`);
      }
    }
  };

  const toggleCamera = async () => {
    if (isCameraOn) {
      cameraStream?.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsCameraOn(false);
    } else {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("MediaDevices API not supported");
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        } catch (e) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          } catch (e2) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          }
        }

        setCameraStream(stream);
        setIsCameraOn(true);
      } catch (err) {
        console.error("Camera error:", err);
        setLastResponse(`> HATA: KAMERA CİHAZI BULUNAMADI VEYA İZİN VERİLMEDİ.`);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <div className="atmosphere"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg glass-panel rounded-3xl overflow-hidden relative cyber-border"
      >
        <div className="scanline"></div>
        
        {/* Header - HUD Style */}
        <div className="p-6 flex items-center justify-between relative z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-[#00ff9d]" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40">Neural Interface</span>
            </div>
            <h1 className="text-2xl font-display tracking-tighter text-[#00ff9d] glow-text">ARTOO-v2.5</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowKeyEntry(true)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 transition-colors"
              title="API Ayarları"
            >
              <Key size={14} />
            </button>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 mb-1">
                <AnimatePresence>
                  {isGenerating && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="w-2 h-2 rounded-full bg-[#00d4ff] shadow-[0_0_8px_#00d4ff] animate-pulse"
                    />
                  )}
                </AnimatePresence>
                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#00ff9d] recording-pulse' : 'bg-red-500'}`}></div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-[#00ff9d]' : 'text-red-500'}`}>{status}</span>
              </div>
              <div className="text-[9px] text-white/30 font-mono">SYS_UPTIME: {Math.floor(performance.now()/1000)}s</div>
            </div>
          </div>
        </div>

        {/* API Key Entry Overlay */}
        <AnimatePresence>
          {showKeyEntry && (
            <motion.div 
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
            >
              <div className="w-full space-y-6">
                <div className="text-center space-y-2">
                  <Key size={32} className="mx-auto text-[#00ff9d] mb-4" />
                  <h2 className="text-xl font-display uppercase tracking-widest text-[#00ff9d]">Güvenli Erişim</h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">Groq API Anahtarınızı Girin</p>
                </div>

                <div className="relative">
                  <input 
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="gsk_****************"
                    className="w-full bg-black/50 border border-[#00ff9d]/30 rounded-xl p-4 text-sm font-mono text-[#00ff9d] focus:outline-none focus:border-[#00ff9d] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={saveApiKey}
                    className="flex items-center justify-center gap-2 bg-[#00ff9d] text-black p-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:brightness-110 transition-all"
                  >
                    <Save size={14} />
                    Kaydet
                  </button>
                  <button 
                    onClick={clearApiKey}
                    className="flex items-center justify-center gap-2 bg-white/5 text-white/60 p-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    <Trash2 size={14} />
                    Temizle
                  </button>
                </div>

                <p className="text-[8px] text-white/20 text-center uppercase leading-relaxed">
                  * Anahtarınız sadece bu cihazda saklanır.<br/>
                  * Asla sunucuya gönderilmez veya paylaşılmaz.
                </p>
                
                <button 
                  onClick={() => setShowKeyEntry(false)}
                  className="w-full text-[9px] text-white/30 uppercase tracking-[0.3em] hover:text-white transition-colors"
                >
                  [ İptal ]
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Visualizer / Camera */}
        <div className="mx-6 mb-6 relative aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/5 group">
          <AnimatePresence mode="wait">
            {isCameraOn ? (
              <motion.video
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover brightness-90 contrast-110"
              />
            ) : (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col items-center justify-center gap-4"
              >
                <div className="relative">
                  <R2D2 isGenerating={isGenerating} isActive={isActive} />
                  {isActive && (
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-[#00ff9d]/10 rounded-full blur-2xl -z-10"
                    />
                  )}
                </div>
                <span className="text-[10px] uppercase tracking-[0.4em] text-white/20">Awaiting Visual Link</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* HUD Overlays */}
          <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none z-20">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <div className="text-[8px] text-[#00ff9d] bg-black/60 px-2 py-0.5 rounded-sm border border-[#00ff9d]/20">
                  SENSORS: {isActive ? 'ONLINE' : 'STBY'}
                </div>
                <div className="text-[8px] text-[#00ff secondary] bg-black/60 px-2 py-0.5 rounded-sm border border-[#00d4ff]/20">
                  FPS: {isCameraOn ? '30.0' : '0.0'}
                </div>
              </div>
              <div className="text-[10px] text-white/60 font-mono bg-black/40 px-2 py-1 rounded backdrop-blur-md">
                {new Date().toLocaleTimeString([], { hour12: false })}
              </div>
            </div>
            
            <div className="flex items-end justify-between">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div 
                    key={i}
                    animate={{ height: isActive ? [4, 12, 4] : 4 }}
                    transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
                    className="w-1 bg-[#00ff9d]/40 rounded-full"
                  />
                ))}
              </div>
              <div className="text-[8px] text-white/20 uppercase tracking-widest">Core_Temp: 32°C</div>
            </div>
          </div>
        </div>

        {/* Response Console */}
        <div className="mx-6 mb-6 p-4 rounded-xl bg-black/30 border border-white/5 min-h-[140px] flex flex-col gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between opacity-40">
            <div className="flex items-center gap-2">
              <Terminal size={12} />
              <span className="text-[9px] uppercase tracking-widest">Neural_Output_Stream</span>
            </div>
            <div className="text-[8px] font-mono">v2.5.0-stable</div>
          </div>
          <div className="text-sm text-white/90 leading-relaxed font-mono overflow-y-auto max-h-32 pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={lastResponse}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="whitespace-pre-wrap"
              >
                {lastResponse || "> INITIALIZING SYSTEM... READY FOR COMMANDS."}
              </motion.div>
            </AnimatePresence>
          </div>
          {/* Decorative corner */}
          <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-[#00ff9d]/30 rounded-br-xl"></div>
        </div>

        {/* Controls Grid */}
        <div className="p-6 grid grid-cols-3 gap-4 bg-white/5 border-t border-white/5">
          <button 
            onClick={toggleCamera}
            className={`group relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 ${isCameraOn ? 'bg-[#00ff9d] text-black shadow-[0_0_20px_rgba(0,255,157,0.3)]' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}
          >
            {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            <span className="text-[9px] uppercase font-bold tracking-tighter">Vision_Link</span>
            {isCameraOn && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full recording-pulse"></div>}
          </button>

          <button 
            onClick={toggleAssistant}
            className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-500 col-span-1 border ${isActive ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-[#00ff9d]/10 border-[#00ff9d]/50 text-[#00ff9d]'}`}
          >
            <Power size={24} className={isActive ? 'recording-pulse' : ''} />
            <span className="text-[10px] uppercase font-black tracking-widest">{isActive ? 'Shutdown' : 'Initialize'}</span>
          </button>

          <div className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-300 ${isActive ? 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]' : 'bg-white/5 border-transparent text-white/20'}`}>
            <Mic size={20} className={isActive ? 'recording-pulse' : ''} />
            <span className="text-[9px] uppercase font-bold tracking-tighter">Audio_In</span>
          </div>
        </div>
      </motion.div>

      {/* Footer Meta */}
      <div className="mt-8 flex gap-12 text-[9px] text-white/10 uppercase tracking-[0.3em] font-bold">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-[#00ff9d] rounded-full shadow-[0_0_5px_#00ff9d]"></div>
          Quantum_Link: Stable
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-[#00d4ff] rounded-full shadow-[0_0_5px_#00d4ff]"></div>
          Processing: Local_Edge
        </div>
      </div>
    </div>
  );
};
