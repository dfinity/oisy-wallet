import type { MinterInfoParams } from '$icp/types/ck';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import { createQueryAndUpdateWithWarmup } from '$lib/services/query.services';
import type {
	PostMessageDataRequestIcCk,
	PostMessageDataResponseError,
	PostMessageJsonDataResponse
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import { assertNonNullish, isNullish, jsonReplacer } from '@dfinity/utils';
import type { CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';
import type { CkEthMinterDid } from '@icp-sdk/canisters/cketh';

export class CkMinterInfoScheduler<
	T extends CkBtcMinterDid.MinterInfo | CkEthMinterDid.MinterInfo
> implements Scheduler<PostMessageDataRequestIcCk> {
	private _queryAndUpdateWithWarmup?: ReturnType<typeof createQueryAndUpdateWithWarmup>;

	private get queryAndUpdateWithWarmup() {
		if (isNullish(this._queryAndUpdateWithWarmup)) {
			this._queryAndUpdateWithWarmup = createQueryAndUpdateWithWarmup();
		}

		return this._queryAndUpdateWithWarmup;
	}

	private timer = new SchedulerTimer('syncCkMinterInfoStatus');

	constructor(
		private interval: number | 'disabled',
		private minterInfo: (params: MinterInfoParams) => Promise<T>
	) {}

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestIcCk | undefined) {
		await this.timer.start<PostMessageDataRequestIcCk>({
			interval: this.interval,
			job: this.syncStatuses,
			data
		});
	}

	async trigger(data: PostMessageDataRequestIcCk | undefined) {
		await this.timer.trigger<PostMessageDataRequestIcCk>({
			job: this.syncStatuses,
			data
		});
	}

	private syncStatuses = async ({
		identity,
		data
	}: SchedulerJobData<PostMessageDataRequestIcCk>) => {
		const minterCanisterId = data?.minterCanisterId;

		assertNonNullish(
			minterCanisterId,
			'No data - minterCanisterId - provided to fetch the minter information.'
		);

		await this.queryAndUpdateWithWarmup<T>({
			request: ({ identity: _, certified }) =>
				this.minterInfo({ minterCanisterId, identity, certified }),
			onLoad: ({ certified, ...rest }) => this.syncMinterInfo({ certified, ...rest }),
			onUpdateError: ({ error }) => this.postMessageWalletError(error),
			identity
		});
	};

	private syncMinterInfo = ({ response, certified }: { response: T; certified: boolean }) => {
		const data: CertifiedData<T> = {
			certified,
			data: response
		};

		this.timer.postMsg<PostMessageJsonDataResponse>({
			msg: 'syncCkMinterInfo',
			data: {
				json: JSON.stringify(data, jsonReplacer)
			}
		});
	};

	private postMessageWalletError(error: unknown) {
		this.timer.postMsg<PostMessageDataResponseError>({
			msg: 'syncCkMinterInfoError',
			data: {
				error
			}
		});
	}
}
