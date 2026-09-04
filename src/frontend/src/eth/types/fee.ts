import type { EthFeePriority } from '$lib/enums/eth-fee-priority';
import type { TransactionFeeData } from '$lib/types/transaction';

export type EthFeePerGas = Pick<TransactionFeeData, 'maxFeePerGas' | 'maxPriorityFeePerGas'>;

/**
 * Every priority the network offers for one fee sample, plus the base fee they share.
 *
 * The base fee is what makes the priorities comparable: it is common to all of them, so the only
 * thing that separates them is the tip. Pricing them on `maxFeePerGas` instead would bury that
 * difference under the shared headroom.
 */
export interface EthFeePriorities {
	baseFeePerGas: bigint;
	perPriority: Record<EthFeePriority, EthFeePerGas>;
	// Kept beside `perPriority` rather than inside it: those entries are spread straight into
	// `TransactionFeeData`, which has no place for a wait estimate.
	waitTimeMs: Record<EthFeePriority, number>;
}
