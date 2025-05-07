import {
	allowSigningPowStore,
	type AllowSigningStoreData,
	type ChallengeCompletionStoreData
} from '$icp/stores/pow-protection.store';
import type { PostMessageDataResponsePowProtector } from '$lib/types/post-message';

export type PowProtectorWorkerInitResult = {
	start: () => void;
	stop: () => void;
	trigger: () => void;
};

export type PowProtectorWorker = () => Promise<PowProtectorWorkerInitResult>;

export const syncPowProtection = ({ data }: { data: PostMessageDataResponsePowProtector }) => {
	// Map PostMessageDataResponsePowProtector to AllowSigningStoreData
	const mappedData: AllowSigningStoreData = {
		status: data.status,
		challengeCompletion: data.challengeCompletion
			? ({
					solvedDurationMs: data.challengeCompletion.solvedDurationMs,
					nextAllowanceMs: data.challengeCompletion.nextAllowanceMs,
					nextDifficulty: data.challengeCompletion.nextDifficulty,
					currentDifficulty: data.challengeCompletion.currentDifficulty
				} as ChallengeCompletionStoreData)
			: null,
		allowedCycles: data.allowedCycles
	};

	allowSigningPowStore.setAllowSigningStoreData(mappedData);
};

export type PowProtectionErrorParams = {
	_error: unknown;
	_hideToast?: boolean;
};

export const syncPowProtectionError = ({ _error: _err }: PowProtectionErrorParams) => {
	// Implementation (removed unused parameter)
};
