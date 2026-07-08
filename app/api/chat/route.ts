import { createOpenAI } from '@ai-sdk/openai'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { SYSTEM_PROMPT } from '@/lib/prompts'
import { tools } from '@/lib/ai-tools'
import { chatRateLimiter } from '@/lib/rate-limiter'

export const runtime = 'nodejs'

const deepseek = createOpenAI({
  baseURL: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

const modelName = process.env.AI_MODEL || 'deepseek-chat'

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'
    if (!chatRateLimiter.check(ip)) {
      return new Response(
        JSON.stringify({ error: '请求过于频繁，请稍后再试' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { messages }: { messages: UIMessage[] } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages', { status: 400 })
    }

    const modelMessages = await convertToModelMessages(messages)
    const trimmedMessages = modelMessages.slice(-40)

    const result = streamText({
      model: deepseek.chat(modelName),
      instructions: SYSTEM_PROMPT,
      messages: trimmedMessages,
      tools,
      maxOutputTokens: 2048,
      abortSignal: AbortSignal.timeout(60000),
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    const message = error instanceof Error ? error.message : '请求失败，请重试'
    const status = message.includes('abort') ? 504 : 500
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
