import * as z from 'zod';

export const BROADCAST_MESSAGES = ['authClientLoginSuccess'] as const;

export const BroadcastMessagesSchema = z.enum(BROADCAST_MESSAGES);
