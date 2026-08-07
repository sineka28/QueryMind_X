import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Volume2, VolumeX } from "lucide-react";

interface VoiceAssistantProps {
  onTranscript: (text: string) => void;
  summary?: string;
}

export function VoiceAssistant({ onTranscript, summary }: VoiceAssistantProps) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const recognitionRef = useRef<unknown>(null);

  // Speak summary when it changes
  useEffect(() => {
    if (!summary || !ttsEnabled || !("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(summary);
    utter.rate = 1;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
    return () => speechSynthesis.cancel();
  }, [summary, ttsEnabled]);

  const startListening = () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript;
      onTranscript(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
    /* eslint-enable @typescript-eslint/no-explicit-any */
  };

  const stopListening = () => {
    const rec = recognitionRef.current as { stop: () => void } | null;
    rec?.stop();
    setListening(false);
  };

  const toggleTts = () => {
    setTtsEnabled(prev => {
      if (prev) speechSynthesis.cancel();
      return !prev;
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={listening ? stopListening : startListening}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
          listening
            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
            : "bg-white/5 text-slate-400 hover:text-slate-200 border border-white/10"
        }`}
        aria-label={listening ? "Stop listening" : "Start voice input"}
      >
        {listening ? (
          <>
            <motion.span
              className="absolute inset-0 rounded-xl border-2 border-rose-500/40"
              animate={{ scale: [1, 1.15, 1], opacity: [0.8, 0.3, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <Square className="h-4 w-4" />
          </>
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>

      <button
        onClick={toggleTts}
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all border ${
          ttsEnabled
            ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
            : "bg-white/5 text-slate-500 border-white/10"
        }`}
        aria-label={ttsEnabled ? "Disable voice output" : "Enable voice output"}
      >
        {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>

      <AnimatePresence>
        {speaking && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="flex items-center gap-1.5"
          >
            {[0, 1, 2, 3].map(i => (
              <motion.span
                key={i}
                className="w-1 rounded-full bg-sky-400"
                animate={{ height: [4, 14, 4] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
