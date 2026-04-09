import { DeepgramClient } from '@deepgram/sdk';
import { readFileSync } from 'fs';

export async function transcribeAudio(audioPath: string): Promise<{
  transcript: string;
  srt: string;
}> {
  const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY! });
  const audioBuffer = readFileSync(audioPath);

  const result = await deepgram.listen.v1.media.transcribeFile(audioBuffer, {
    model: 'nova-3',
    smart_format: true,
    diarize: true,
    punctuate: true,
    utterances: true,
  });

  const transcript =
    result.result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';

  const utterances = result.result?.results?.utterances ?? [];
  const srt = generateSRT(utterances);

  return { transcript, srt };
}

interface Utterance {
  start: number;
  end: number;
  transcript: string;
}

function generateSRT(utterances: Utterance[]): string {
  return utterances
    .map((u, i) => {
      const start = formatSRTTime(u.start);
      const end = formatSRTTime(u.end);
      return `${i + 1}\n${start} --> ${end}\n${u.transcript}\n`;
    })
    .join('\n');
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${ms.toString().padStart(3, '0')}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
