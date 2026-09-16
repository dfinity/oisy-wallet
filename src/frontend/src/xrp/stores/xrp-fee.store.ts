import type { TokenId } from '$lib/types/token';
import { writable, type Readable, type Writable } from 'svelte/store';

export type FeeStoreData = bigint | undefined;

export interface FeeStore extends Readable<FeeStoreData> {
	setFee: (data: bigint | undefined) => void;
}

export const initFeeStore = (): FeeStore => {
	const { subscribe, set } = writable<FeeStoreData>(undefined);

	return {
		subscribe,
		setFee: (data: bigint | undefined) => {
			set(data);
		}
	};
};

export type ReserveStoreData = bigint | undefined;

export interface ReserveStore extends Readable<ReserveStoreData> {
	setReserve: (data: ReserveStoreData) => void;
}

/**
 * Drops the account must retain, so the send form can exclude them from the max amount.
 *
 * `undefined` means the requirement is UNKNOWN, which is not the same as the base reserve:
 * base-only is the smallest figure the ledger can demand, so defaulting to it would overstate
 * the sendable maximum for any account that owns ledger objects. Only `account_info` reports
 * the real `OwnerCount`, so until it answers — or when it fails for any reason other than the
 * account being absent — the amount is left unknown and sending is blocked.
 */
export const initReserveStore = (): ReserveStore => {
	const { subscribe, set } = writable<ReserveStoreData>(undefined);

	return {
		subscribe,
		setReserve: (data: ReserveStoreData) => {
			set(data);
		}
	};
};

export interface XrpFeeContext {
	feeStore: FeeStore;
	reserveStore: ReserveStore;
	feeSymbolStore: Writable<string | undefined>;
	feeDecimalsStore: Writable<number | undefined>;
	feeTokenIdStore: Writable<TokenId | undefined>;
	feeExchangeRateStore: Writable<number | undefined>;
}

export const initXrpFeeContext = (params: XrpFeeContext): XrpFeeContext => params;

export const XRP_FEE_CONTEXT_KEY = Symbol('xrp-fee');
