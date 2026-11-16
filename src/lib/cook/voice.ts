export type VoiceCommand = 'next' | 'back' | 'repeat' | 'timer' | 'stop';

const PHRASES: [VoiceCommand, RegExp][] = [
  ['stop', /^(stop listening|stop voice|voice off)$/],
  ['timer', /^((start|set)( the| a)? timer|timer)$/],
  ['repeat', /^(repeat|repeat that|repeat the step|say that again|say it again|read that again|read it again|read it|again)$/],
  ['back', /^(back|go back|previous|previous step|last step)$/],
  ['next', /^(next|next step|next one|continue|go on|okay next|ok next)$/],
];

/**
 * Turns something heard in the kitchen into a command, or null. The whole
 * utterance has to be one of the phrases: a kitchen is full of talk, and
 * "what is next for the weekend" must not skip a step.
 */
export const parseVoiceCommand = (transcript: string): VoiceCommand | null => {
  const said = transcript.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  return PHRASES.find(([, re]) => re.test(said))?.[0] ?? null;
};

export const VOICE_HELP = 'Say “next”, “back”, “repeat” or “start timer”.';
