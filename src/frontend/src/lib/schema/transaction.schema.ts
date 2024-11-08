import { z } from 'zod';

const commonTypes = ['send', 'receive'] as const;

const ethSpecificTypes = ['withdraw', 'deposit'] as const;

const icpSpecificTypes = ['approve', 'burn', 'mint'] as const;

const allTypes = [...commonTypes, ...ethSpecificTypes, ...icpSpecificTypes] as const;

export const btcTransactionTypes = commonTypes;

export const ethTransactionTypes = [...commonTypes, ...ethSpecificTypes];

export const icpTransactionTypes = [...commonTypes, ...icpSpecificTypes];

export const TransactionTypeSchema = z.enum(allTypes);
