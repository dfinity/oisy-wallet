import type { TokenId } from '$lib/types/token';
import { getXrpReserveDrops } from '$xrp/utils/xrp-send.utils';
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

export interface ReserveStore extends Readable<bigint> {
	setReserve: (data: bigint) => void;
}

/**
 * Drops the account must retain, so the send form can exclude them from the max amount.
 *
 * Starts at the requirement of an account that owns nothing — the UI always needs a usable
 * figure, and `account_info` only reports the real `OwnerCount` once it answers.
 */
export const initReserveStore = (): ReserveStore => {
	const { subscribe, set } = writable<bigint>(getXrpReserveDrops({ ownerCount: 0 }));

	return {
		subscribe,
		setReserve: (data: bigint) => {
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
