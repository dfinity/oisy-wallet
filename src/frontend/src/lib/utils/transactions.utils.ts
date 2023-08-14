import { isNullish } from '@dfinity/utils';
import type { TransactionResponse } from '@ethersproject/abstract-provider';

export const isTransactionPending = ({ blockNumber }: TransactionResponse): boolean =>
	isNullish(blockNumber);
