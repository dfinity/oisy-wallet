import type { IcCkTwinToken } from '$icp/types/ic';
import type { PostMessageDataRequestIcCk } from '$lib/types/post-message';
import type { Token } from '$lib/types/token';

export type IcCkWorkerParams = PostMessageDataRequestIcCk & { token: Token } & Partial<
		Partial<IcCkTwinToken>
	>;

export interface IcCkWorkerInitResult {
	start: () => void;
	stop: () => void;
	trigger: () => void;
}

export type IcCkWorker = (params: IcCkWorkerParams) => Promise<IcCkWorkerInitResult>;
