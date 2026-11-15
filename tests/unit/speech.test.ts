import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { recognitionConstructor, recognitionError, speechLanguage, splitForSpeech, type RecognitionConstructor } from '@/lib/speech';

class FakeRecognition {}

describe('bilingual voice accessibility', () => {
  it('matches recognition and synthesis to the interface language', () => { expect(speechLanguage('pt-BR')).toBe('pt-BR'); expect(speechLanguage('en')).toBe('en-US'); });
  it('supports standard, prefixed and unavailable recognition', () => { const constructor = FakeRecognition as unknown as RecognitionConstructor; expect(recognitionConstructor({ SpeechRecognition: constructor, webkitSpeechRecognition: undefined })).toBe(constructor); expect(recognitionConstructor({ SpeechRecognition: undefined, webkitSpeechRecognition: constructor })).toBe(constructor); expect(recognitionConstructor({ SpeechRecognition: undefined, webkitSpeechRecognition: undefined })).toBeUndefined(); });
  it('translates common microphone errors', () => { expect(recognitionError('not-allowed', 'pt-BR')).toContain('negado'); expect(recognitionError('not-allowed', 'en')).toContain('denied'); expect(recognitionError('no-speech', 'pt-BR')).toContain('Não ouvi'); expect(recognitionError('network', 'en')).toContain('internet'); });
  it('splits long page text without losing words', () => { const text = 'Primeira frase curta. ' + Array.from({ length: 80 }, (_, index) => `palavra${index}`).join(' '); const chunks = splitForSpeech(text, 80); expect(chunks.length).toBeGreaterThan(2); expect(chunks.every((chunk) => chunk.length <= 80)).toBe(true); expect(chunks.join(' ')).toContain('palavra79'); expect(splitForSpeech('   ')).toEqual([]); });
  it('wires voice input and compact page-reading controls with bilingual accessible labels', () => { const voice = readFileSync('components/chat/voice-input-button.tsx', 'utf8'); const i18n = readFileSync('lib/i18n.ts', 'utf8'); const reader = readFileSync('components/accessibility/page-reader.tsx', 'utf8'); expect(voice).toContain('copy.speak'); expect(voice).toContain('copy.stop'); expect(i18n).toContain('Speak your answer'); expect(i18n).toContain('Falar sua resposta'); expect(reader).toContain('Read page'); expect(reader).toContain('Ler página'); expect(reader).toContain('Stop reading'); expect(reader).toContain('Parar leitura'); expect(reader).not.toContain('Pause reading'); expect(reader).not.toContain('Velocidade'); });
});
