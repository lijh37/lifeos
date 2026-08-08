/**
 * 内联迁移定义与 migrations/*.sql 无漂移校验。
 * 手机端依赖 lib/db/migrations.ts 内联 SQL（铁律③），
 * 该测试保证手工复制后任一文件更新时内联定义会被同步。
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { MIGRATIONS } from '@/lib/db/migrations'

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations')

describe('内联迁移定义与 migrations/*.sql 无漂移', () => {
  it('每个内联迁移都有对应文件且内容逐字一致', () => {
    for (const m of MIGRATIONS) {
      const file = path.join(MIGRATIONS_DIR, m.name)
      expect(fs.existsSync(file), `缺少迁移文件: ${m.name}`).toBe(true)
      expect(m.sql, `内联内容与 ${m.name} 不一致`).toBe(fs.readFileSync(file, 'utf-8'))
    }
  })

  it('migrations/ 目录文件与内联定义一一对应', () => {
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()
    const inlineNames = MIGRATIONS.map((m) => m.name).sort()
    expect(inlineNames).toEqual(files)
  })

  it('version 连续且唯一，与文件名前缀一致', () => {
    const versions = MIGRATIONS.map((m) => m.version)
    expect(new Set(versions).size).toBe(versions.length)
    for (const m of MIGRATIONS) {
      const prefix = parseInt(m.name.split('_')[0], 10)
      expect(m.version, `版本号与文件名前缀不一致: ${m.name}`).toBe(prefix)
    }
  })
})
