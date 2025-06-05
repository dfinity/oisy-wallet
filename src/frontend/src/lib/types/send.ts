export interface TransferParams {
	from: string;
	to: string;
	amount: bigint;
	maxPriorityFeePerGas: bigint;
	maxFeePerGas: bigint;
	data?: string;
}

export class InsufficientFundsError extends Error {}

export type Amount = string | number;
export type OptionAmount = Amount | undefined;

export type SendDestinationTab = 'recentlyUsed' | 'contacts';
