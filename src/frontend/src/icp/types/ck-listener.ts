import type { IcCkToken } from '$icp/types/ic';

export type IcCkWorkerParams = Omit<IcCkToken, 'twinToken'>;

export interface IcCkWorkerInitResult {
	start: () => void;
	stop: () => void;
	trigger: () => void;
}

export type IcCkWorker = (params: IcCkWorkerParams) => Promise<IcCkWorkerInitResult>;
