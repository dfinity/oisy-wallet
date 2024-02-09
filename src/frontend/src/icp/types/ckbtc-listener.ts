import type { IcCkCanisters, IcToken } from '$icp/types/ic';

export type CkBTCWorkerParams = IcToken & Partial<IcCkCanisters>;

export interface CkBTCWorkerInitResult {
	start: () => void;
	stop: () => void;
	trigger: () => void;
}

export type CkBTCWorker = (params: CkBTCWorkerParams) => Promise<CkBTCWorkerInitResult>;
