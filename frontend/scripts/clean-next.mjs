import { rmSync, existsSync } from 'fs'
import { join } from 'path'

const root = process.cwd()
const nextDir = join(root, '.next')

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true })
  console.log('Removed .next')
} else {
  console.log('No .next directory (nothing to clean)')
}
