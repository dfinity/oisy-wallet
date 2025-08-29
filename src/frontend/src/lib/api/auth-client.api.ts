import { IdbStorage } from '@dfinity/auth-client';

// We use a dedicated storage for the auth client to better manage it, e.g. clear it for a new login
// @see src/lib/utils/auth.utils.ts safeCreateAuthClient
export const authClientStorage = new IdbStorage();
