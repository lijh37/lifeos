import { NextRequest, NextResponse } from 'next/server'
import { getAllTags, renameTag, deleteTag } from '@/lib/db'

const GETHandler = async function GET() {
  const tags = await getAllTags()
  return NextResponse.json({ tags })
}

// export 构建（BUILD_TARGET=export）下 GET 置空（静态导出无服务端运行时，E301）。
// `as typeof GETHandler` 断言使 tsc 视 GET 为纯函数类型（消除 TS2722/TS18048），
// 运行时在 export 下仍为 undefined。
export const GET = (process.env.BUILD_TARGET === 'export' ? undefined : GETHandler) as typeof GETHandler

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { oldName, newName } = body
  if (!oldName || !newName) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }
  await renameTag(oldName, newName)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  if (!name) {
    return NextResponse.json({ error: '缺少 name 参数' }, { status: 400 })
  }
  await deleteTag(name)
  return NextResponse.json({ success: true })
}
