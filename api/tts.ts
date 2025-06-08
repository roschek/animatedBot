import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { text } = req.body

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' })
    }

    const response = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVEN_LABS_API_KEY!,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.7,
            style: 0.2,
            similarity_boost: 0.75,
            use_speaker_boost: true,
          },
        }),
      },
    )

    if (!response.ok) {
      return res.status(500).json({ error: 'TTS generation failed' })
    }

    const audioBuffer = await response.arrayBuffer()

    res.setHeader('Content-Type', 'audio/mpeg')
    res.send(Buffer.from(audioBuffer))
  } catch (error) {
    console.error('TTS error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
