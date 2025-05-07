import { writable, type Readable } from 'svelte/store';

/* export type PowProtectionAllowedSigningData = CertifiedData<string>;
export const powProtectionAllowedSigningStore =
	initCertifiedSetterStore<PowProtectionAllowedSigningData>();

export type BtcStatusesData = CertifiedData<BtcWithdrawalStatuses>;
export const btcStatusesStore = initCertifiedSetterStore<BtcStatusesData>();
 */

interface ChallengeCompletionStoreData {
	solvedDurationMs: bigint;
	nextAllowanceMs: bigint;
	nextDifficulty: number;
	currentDifficulty: number;
}

interface AllowSigningStoreData {
	status: string;
	challengeCompletion: ChallengeCompletionStoreData;
	allowedCycles: bigint;
}

export interface AllowSigningStore extends Readable<AllowSigningStoreData> {
	setAllowSigningStoreData: (data: AllowSigningStoreData) => void;
}

export const initBitcoinFeeStore = (): AllowSigningStore => {
	const { subscribe, set } = writable<AllowSigningStoreData>(undefined);

	return {
		subscribe,

		setAllowSigningStoreData: (data: AllowSigningStoreData) => {
			set(data);
		}
	};
};
