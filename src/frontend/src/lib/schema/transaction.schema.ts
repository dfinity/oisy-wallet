import * as z from 'zod/v4';

const commonTypes = ['send', 'receive'] as const;

const ethSpecificTypes = ['withdraw', 'deposit'] as const;

const icpSpecificTypes = ['approve', 'burn', 'mint'] as const;

const allTypes = [...commonTypes, ...ethSpecificTypes, ...icpSpecificTypes] as const;

export const btcTransactionTypes = z.enum(commonTypes);

export const ethTransactionTypes = z.enum([...commonTypes, ...ethSpecificTypes]);

export const icpTransactionTypes = z.enum([...commonTypes, ...icpSpecificTypes]);

export const solTransactionTypes = z.enum(commonTypes);

export const TransactionTypeSchema = z.enum(allTypes);

export const TransactionStatusSchema = z.enum(['confirmed', 'pending', 'unconfirmed']);

export const TransactionIdSchema = z.string();
