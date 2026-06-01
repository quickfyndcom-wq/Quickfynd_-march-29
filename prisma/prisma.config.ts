import { defineConfig } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || ''
  },
  adapter: () => {
    const connectionString = process.env.DATABASE_URL
    const pool = new Pool({ connectionString })
    return new PrismaNeon(pool)
  }
})
