import { createClient } from '@tursodatabase/api'

const ORG = process.env.TURSO_ORG || 'lijh37'
const TOKEN = process.env.TURSO_PLATFORM_TOKEN || ''

const turso = createClient({ org: ORG, token: TOKEN })

async function main() {
  console.log('获取组织信息...')
  try {
    const org = await (turso as any).organizations?.get?.(ORG) || {}
    console.log('组织:', JSON.stringify(org, null, 2))
  } catch {}

  console.log('\n获取可用 groups...')
  try {
    const groups = await (turso as any).groups?.list?.() || []
    console.log('Groups:', JSON.stringify(groups, null, 2))
  } catch (e) {
    console.error('Groups error:', e)
  }

  console.log('\n获取已有 databases...')
  try {
    const dbs = await turso.databases.list()
    console.log('Databases:', JSON.stringify(dbs, null, 2))
  } catch (e) {
    console.error('DBs error:', e)
  }
}

main().catch(e => console.error('Error:', e))
