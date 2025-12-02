import type { TransactionFeeData } from '$lib/types/transaction';

export interface EthFeeResult {
	feeInWei: bigint;
	feeData: Omit<TransactionFeeData, 'gas'>;
	estimatedGasLimit: bigint;
}
