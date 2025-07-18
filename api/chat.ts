import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY!,
})

export async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { message } = req.body

        const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `You are a teenager talking to another teenager. Always respond in 2-3 sentences using youth
          slang and casual conversational style. Be friendly but informal. Here's the message: ${message}`
        }
      ],
    })

    let reply = 'No response'
    if (Array.isArray(response.content) && response.content.length > 0) {
      const block = response.content[0]
      if (typeof block === 'string') {
        reply = block
      } else if ('text' in block && typeof block.text === 'string') {
        reply = block.text
      }
    }
    return res.status(200).json({
      response: reply,
    })
  } catch (error) {
    console.error('Claude API error:', error)
    return res.status(500).json({
      error: 'API Error',
    })
  }
}
export default handler
