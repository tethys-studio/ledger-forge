import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database: pool,
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      enabled: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
      scope: ['profile', 'email'],
      mapProfileToUser: (profile) => ({
        image: profile.picture,
        name: profile.name,
      }),
    },
  },
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          if (account.providerId === 'google' && account.userId && account.idToken) {
            try {
              const base64Url = account.idToken.split('.')[1];
              if (base64Url) {
                const payload = JSON.parse(Buffer.from(base64Url, 'base64').toString());
                if (payload.picture) {
                  await pool.query(
                    `UPDATE public."user" SET image = $1 WHERE id = $2`,
                    [payload.picture, account.userId]
                  );
                }
              }
            } catch (e) {
              console.error('Failed to sync Google avatar to user record:', e);
            }
          }
        },
      },
      update: {
        after: async (account) => {
          if (account.providerId === 'google' && account.userId && account.idToken) {
            try {
              const base64Url = account.idToken.split('.')[1];
              if (base64Url) {
                const payload = JSON.parse(Buffer.from(base64Url, 'base64').toString());
                if (payload.picture) {
                  await pool.query(
                    `UPDATE public."user" SET image = $1 WHERE id = $2`,
                    [payload.picture, account.userId]
                  );
                }
              }
            } catch (e) {
              console.error('Failed to update Google avatar on sign in:', e);
            }
          }
        },
      },
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
});

