import type { Transaction } from '$lib/types/transaction';
import { isNullish } from '@dfinity/utils';

export const isTransactionPending = ({ blockNumber }: Transaction): boolean =>
	isNullish(blockNumber);
