import Groq from 'groq-sdk';

export async function generateMetadata(transcript: string): Promise<{
  title: string;
  summary: string;
}> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'user',
        content: `Given this video transcript, generate a concise title (max 60 chars) and a 2-3 sentence summary.

Transcript: ${transcript.slice(0, 4000)}

Respond with JSON: {"title": "...", "summary": "..."}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { title: 'Untitled Recording', summary: '' };
  }

  try {
    return JSON.parse(content);
  } catch {
    return { title: 'Untitled Recording', summary: '' };
  }
}
