import { z } from 'zod';

const commonTypes = ['send', 'receive'] as const;

const ethSpecificTypes = ['withdraw', 'deposit'] as const;

const icpSpecificTypes = ['approve', 'burn', 'mint'] as const;

const allTypes = [...commonTypes, ...ethSpecificTypes, ...icpSpecificTypes] as const;

export const btcTransactionTypes = z.enum(commonTypes);

export const ethTransactionTypes = z.enum([...commonTypes, ...ethSpecificTypes]);

export const icpTransactionTypes = z.enum([...commonTypes, ...icpSpecificTypes]);

export const TransactionTypeSchema = z.enum(allTypes);
