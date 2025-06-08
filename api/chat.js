import { Anthropic } from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
})

export default async function handler(req, res) {
  console.log('🔥 API called:', {
    method: req.method,
    hasApiKey: !!process.env.CLAUDE_API_KEY,
  })

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (!process.env.CLAUDE_API_KEY) {
      console.error('❌ No API key!')
      return res.status(500).json({ error: 'API key not configured' })
    }

    const { message } = req.body
    console.log('📝 Processing message:', message)

    if (!message) {
      return res.status(400).json({ error: 'Message required' })
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 250,
      temperature: 0.7,
      system: `You are a friendly AI companion for a cute Baby Friend character. 
      Keep responses warm, conversational, and concise (1-2 sentences). 
      Use simple, friendly language. Show personality and be engaging.

      IMPORTANT: You can add emotion tags to enhance animations:
      - [EMOTION:happy] - for joy, excitement  
      - [EMOTION:sad] - for sympathy
      - [EMOTION:thinking] - when pondering
      - [EMOTION:surprised] - for wow moments
      - [EMOTION:waving] - for greetings, goodbyes
      - [EMOTION:neutral] - back to calm

      Example: "[EMOTION:waving] Hello! [EMOTION:thinking] Let me think... [EMOTION:happy] I've got it!"`,
      messages: [{ role: 'user', content: message }],
    })

    console.log('✅ Claude responded successfully')

    const aiResponse = response.content[0]

    if (aiResponse && aiResponse.type === 'text') {
      return res.status(200).json({
        response: aiResponse.text,
        usage: response.usage,
      })
    } else {
      throw new Error('Unexpected response type')
    }
  } catch (error) {
    console.error('❌ API Error:', {
      name: error.name,
      message: error.message,
      status: error.status,
      stack: error.stack,
    })

    return res.status(500).json({
      error: "I'm having trouble thinking right now. Please try again!",
      details: error.message,
    })
  }
}
