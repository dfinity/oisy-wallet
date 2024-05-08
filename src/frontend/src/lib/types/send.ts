import type { BigNumber } from '@ethersproject/bignumber';

export interface TransferParams {
	from: string;
	to: string;
	amount: BigNumber;
	maxPriorityFeePerGas: bigint;
	maxFeePerGas: bigint;
	data?: string;
}

export class AmountAssertionError extends Error {}

export class InsufficientFundsError extends AmountAssertionError {}
