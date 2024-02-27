import type { IcCkCanisters, IcToken } from '$icp/types/ic';

export type IcCkWorkerParams = IcToken & Partial<IcCkCanisters>;

export interface IcCkWorkerInitResult {
	start: () => void;
	stop: () => void;
	trigger: () => void;
}

export type IcCkWorker = (params: IcCkWorkerParams) => Promise<IcCkWorkerInitResult>;
