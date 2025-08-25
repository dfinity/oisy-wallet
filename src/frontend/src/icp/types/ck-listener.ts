import type { IcCkLinkedAssets } from '$icp/types/ic-token';
import type { PostMessageDataRequestIcCk } from '$lib/types/post-message';
import type { Token } from '$lib/types/token';

export type IcCkWorkerParams = PostMessageDataRequestIcCk & { token: Token } & Partial<
		Partial<IcCkLinkedAssets>
	>;

export interface IcCkWorkerInitResult {
	start: () => void;
	stop: () => void;
	trigger: () => void;
	destroy: () => void;
}

export type IcCkWorker = (params: IcCkWorkerParams) => Promise<IcCkWorkerInitResult>;
