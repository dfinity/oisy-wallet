import { writable, type Readable } from 'svelte/store';

/* export type PowProtectionAllowedSigningData = CertifiedData<string>;
export const powProtectionAllowedSigningStore =
	initCertifiedSetterStore<PowProtectionAllowedSigningData>();

export type BtcStatusesData = CertifiedData<BtcWithdrawalStatuses>;
export const btcStatusesStore = initCertifiedSetterStore<BtcStatusesData>();
 */

// Define the types we need for mapping the data
export type ChallengeCompletionStoreData = {
	solvedDurationMs: bigint;
	nextAllowanceMs: bigint;
	nextDifficulty: number;
	currentDifficulty: number;
};

export type AllowSigningStoreData = {
	status: string;
	challengeCompletion: ChallengeCompletionStoreData | null;
	allowedCycles: bigint;
};

export interface AllowSigningStore extends Readable<AllowSigningStoreData> {
	setAllowSigningStoreData: (data: AllowSigningStoreData) => void;
}

export const initAllowSigningStore = (): AllowSigningStore => {
	const { subscribe, set } = writable<AllowSigningStoreData>(undefined);

	return {
		subscribe,

		setAllowSigningStoreData: (data: AllowSigningStoreData) => {
			set(data);
		}
	};
};

export const allowSigningPowStore = initAllowSigningStore();
