import type { MinterInfoParams } from '$icp/types/ck';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type {
	PostMessageDataRequestIcCk,
	PostMessageDataResponseError,
	PostMessageJsonDataResponse
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { MinterInfo as CkBTCMinterInfo } from '@dfinity/ckbtc';
import type { MinterInfo as CkETHMinterInfo } from '@dfinity/cketh';
import { assertNonNullish, jsonReplacer, queryAndUpdate } from '@dfinity/utils';

export class CkMinterInfoScheduler<T extends CkBTCMinterInfo | CkETHMinterInfo>
	implements Scheduler<PostMessageDataRequestIcCk>
{
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

		await queryAndUpdate<T>({
			request: ({ identity: _, certified }) =>
				this.minterInfo({ minterCanisterId, identity, certified }),
			onLoad: ({ certified, ...rest }) => this.syncMinterInfo({ certified, ...rest }),
			onUpdateError: ({ error }) => this.postMessageWalletError(error),
			identity,
			resolution: 'all_settled'
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
