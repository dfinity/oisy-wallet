import { z } from 'zod';

export const TransactionTypeSchema = z.enum([
	// All
	'send',
	'receive',
	// ETH
	'withdraw',
	'deposit',
	// ICP
	'approve',
	'burn',
	'mint'
]);
