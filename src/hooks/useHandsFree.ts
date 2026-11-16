import { useCallback, useEffect, useRef, useState } from 'react';
import { parseVoiceCommand, type VoiceCommand } from '@/lib/cook/voice';

// The Web Speech recognition API isn't in TypeScript's DOM types everywhere; this is the part used here.
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type RecognitionCtor = new () => Recognition;

const recognitionCtor = (): RecognitionCtor | undefined => {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export const canReadAloud = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
export const canListen = () => Boolean(recognitionCtor());

/** Reads text aloud. Each call replaces whatever was being said. */
export const useSpeaker = () => {
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  return useCallback((text: string) => {
    if (!canReadAloud() || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, []);
};

export type ListenError = 'blocked' | 'unavailable' | null;

/**
 * Listens for short spoken commands while `enabled`. Browsers end a listening
 * session after a pause, so it restarts itself until turned off.
 */
export const useVoiceCommands = (enabled: boolean, onCommand: (command: VoiceCommand) => void): ListenError => {
  const [error, setError] = useState<ListenError>(null);
  const handler = useRef(onCommand);
  handler.current = onCommand;

  useEffect(() => {
    if (!enabled) return;
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError('unavailable');
      return;
    }
    setError(null);
    let active = true;
    let restart: ReturnType<typeof setTimeout> | undefined;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        const command = parseVoiceCommand(e.results[i][0].transcript);
        if (command) handler.current(command);
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        active = false;
        setError('blocked');
      }
    };
    const start = () => {
      try {
        rec.start();
      } catch {
        // Already started; the next "end" event will try again.
      }
    };
    rec.onend = () => {
      if (active) restart = setTimeout(start, 300);
    };
    start();
    return () => {
      active = false;
      clearTimeout(restart);
      rec.onend = null;
      rec.abort();
    };
  }, [enabled]);

  return enabled ? error : null;
};
