import { allowSigningPowStore, type AllowSigningStoreData } from '$lib/stores/pow-protection.store';
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
		progress: data.progress,
		nextAllowanceMs: data.nextAllowanceMs
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
