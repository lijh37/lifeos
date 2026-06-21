import { createOpenAI } from '@ai-sdk/openai'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { SYSTEM_PROMPT } from '@/lib/prompts'
import { initDB } from '@/lib/db'

export const runtime = 'nodejs'

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

export async function POST(req: Request) {
  try {
    await initDB()
    const body = await req.json()
    const { messages }: { messages: UIMessage[] } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages', { status: 400 })
    }

    const modelMessages = await convertToModelMessages(messages)

    const result = streamText({
      model: deepseek.chat('deepseek-v4-flash'),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
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
