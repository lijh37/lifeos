/** 读取响应体 error 并抛出统一错误（web 分支共用） */
export async function throwHttpError(res: Response): Promise<never> {
  const body = await res.json().catch(() => null)
  throw new Error(body?.error || `HTTP ${res.status}`)
}
