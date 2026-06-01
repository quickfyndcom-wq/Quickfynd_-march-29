import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';

import ws from 'ws';
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

// Do not throw during build-time if env is missing; runtime routes should still fail gracefully
const hasDbUrl = !!process.env.DATABASE_URL

let prisma;

if (process.env.NODE_ENV === 'production') {
  // In production, instantiate normally (Prisma connects lazily)
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    const connectionString = process.env.DATABASE_URL;
    const adapter = connectionString ? new PrismaNeon({ connectionString }) : null;
    
    // If no DB URL in dev, create a client without adapter just to avoid build-time crashes;
    // any actual DB call will fail clearly at runtime which is acceptable for dev/build.
    global.prisma = new PrismaClient(
      process.env.NEXT_RUNTIME === 'edge' && adapter
        ? { adapter }
        : {
            log: ['query', 'error', 'warn'],
            errorFormat: 'pretty',
          }
    );
  }
  prisma = global.prisma;
}

export default prisma; 