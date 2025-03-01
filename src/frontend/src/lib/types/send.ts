import type { BigNumber } from '@ethersproject/bignumber';

export interface TransferParams {
	from: string;
	to: string;
	amount: BigNumber;
	maxPriorityFeePerGas: bigint;
	maxFeePerGas: bigint;
	data?: string;
}

export class InsufficientFundsError extends Error {}

export type Amount = string | number;
export type OptionAmount = Amount | undefined;
