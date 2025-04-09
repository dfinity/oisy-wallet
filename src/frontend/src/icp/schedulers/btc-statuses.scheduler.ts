import { withdrawalStatuses } from '$icp/api/ckbtc-minter.api';
import { BTC_STATUSES_TIMER_INTERVAL_MILLIS } from '$icp/constants/ckbtc.constants';
import type { BtcWithdrawalStatuses } from '$icp/types/btc';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type {
	PostMessageDataRequestIcCk,
	PostMessageDataResponseError,
	PostMessageJsonDataResponse
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { RetrieveBtcStatusV2WithId } from '@dfinity/ckbtc';
import { assertNonNullish, jsonReplacer, nonNullish, queryAndUpdate } from '@dfinity/utils';

export class BtcStatusesScheduler implements Scheduler<PostMessageDataRequestIcCk> {
	private timer = new SchedulerTimer('syncBtcStatusesStatus');

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestIcCk | undefined) {
		await this.timer.start<PostMessageDataRequestIcCk>({
			interval: BTC_STATUSES_TIMER_INTERVAL_MILLIS,
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
			'No data - minterCanisterId - provided to fetch the BTC withdrawal statuses.'
		);

		await queryAndUpdate<RetrieveBtcStatusV2WithId[]>({
			request: ({ identity: _, certified }) =>
				withdrawalStatuses({ minterCanisterId, identity, certified }),
			onLoad: ({ certified, ...rest }) => this.syncStatusesResults({ certified, ...rest }),
			onUpdateError: ({ error }) => this.postMessageWalletError(error),
			identity,
			resolution: 'all_settled'
		});
	};

	private syncStatusesResults = ({
		response,
		certified
	}: {
		response: RetrieveBtcStatusV2WithId[];
		certified: boolean;
	}) => {
		const statuses = response.reduce<BtcWithdrawalStatuses>(
			(acc, { id, status }) => ({
				...acc,
				...(nonNullish(status) && { [`${id}`]: status })
			}),
			{}
		);

		const data: CertifiedData<BtcWithdrawalStatuses> = {
			certified,
			data: statuses
		};

		this.timer.postMsg<PostMessageJsonDataResponse>({
			msg: 'syncBtcStatuses',
			data: {
				json: JSON.stringify(data, jsonReplacer)
			}
		});
	};

	private postMessageWalletError(error: unknown) {
		this.timer.postMsg<PostMessageDataResponseError>({
			msg: 'syncBtcStatusesError',
			data: {
				error
			}
		});
	}
}
