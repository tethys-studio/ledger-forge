import { auth } from './auth';
import { headers } from 'next/headers';

/**
 * Retrieve active session from current request headers on server.
 */
export async function getServerSession() {
  try {
    const reqHeaders = await headers();
    return await auth.api.getSession({
      headers: reqHeaders,
    });
  } catch (error) {
    console.error('Error fetching server session:', error);
    return null;
  }
}

/**
 * Retrieve authenticated user from server session.
 * Throws an error if no active session exists (for server actions).
 */
export async function getAuthenticatedUser() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error('UNAUTHORIZED: An active authentication session is required.');
  }
  return session.user;
}
