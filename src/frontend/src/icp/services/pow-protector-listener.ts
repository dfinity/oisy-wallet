import {
	powProtectoreNextAllowanceStore,
	powProtectoreProgressStore,
	type PowProtectorNextAllowanceData,
	type PowProtectorProgressData
} from '$lib/stores/pow-protection.store';
import type {
	PostMessageDataResponsePowProtectorNextAllowance,
	PostMessageDataResponsePowProtectorProgress
} from '$lib/types/post-message';

export type PowProtectorWorkerInitResult = {
	start: () => void;
	stop: () => void;
	trigger: () => void;
};

export type PowProtectorWorker = () => Promise<PowProtectorWorkerInitResult>;

export const syncPowProgress = ({
	data
}: {
	data: PostMessageDataResponsePowProtectorProgress;
}) => {
	const mappedData: PowProtectorProgressData = {
		progress: data.progress
	};
	powProtectoreProgressStore.setPowProtectorProgressData(mappedData);
};

export const syncPowNextAllowance = ({
	data
}: {
	data: PostMessageDataResponsePowProtectorNextAllowance;
}) => {
	const mappedData: PowProtectorNextAllowanceData = {
		nextAllowanceMs: data.nextAllowanceMs
	};
	powProtectoreNextAllowanceStore.setPowProtectorNextAllowanceData(mappedData);
};
