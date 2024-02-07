import { withdrawalStatuses } from '$icp/api/ckbtc-minter.api';
import { BTC_STATUSES_TIMER_INTERVAL_MILLIS } from '$icp/constants/ckbtc.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$icp/schedulers/scheduler';
import type { BtcWithdrawalStatuses } from '$icp/types/btc';
import { queryAndUpdate } from '$lib/actors/query.ic';
import type {
	PostMessageDataRequestCkBTCWallet,
	PostMessageDataResponseCkBTCWallet,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { RetrieveBtcStatusV2WithId } from '@dfinity/ckbtc';
import { assertNonNullish, jsonReplacer, nonNullish } from '@dfinity/utils';

export class BtcStatusesScheduler implements Scheduler<PostMessageDataRequestCkBTCWallet> {
	private timer = new SchedulerTimer();

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestCkBTCWallet | undefined) {
		await this.timer.start<PostMessageDataRequestCkBTCWallet>({
			interval: BTC_STATUSES_TIMER_INTERVAL_MILLIS,
			job: this.syncStatuses,
			data
		});
	}

	async trigger(data: PostMessageDataRequestCkBTCWallet | undefined) {
		await this.timer.trigger<PostMessageDataRequestCkBTCWallet>({
			job: this.syncStatuses,
			data
		});
	}

	private syncStatuses = async ({
		identity,
		data
	}: SchedulerJobData<PostMessageDataRequestCkBTCWallet>) => {
		const minterCanisterId = data?.minterCanisterId;

		assertNonNullish(
			minterCanisterId,
			'No data - minterCanisterId - provided to fetch the BTC withdrawal statuses.'
		);

		await queryAndUpdate<RetrieveBtcStatusV2WithId[]>({
			request: ({ identity: _, certified }) =>
				withdrawalStatuses({ minterCanisterId, identity, certified }),
			onLoad: ({ certified, ...rest }) => this.syncStatusesResults({ certified, ...rest }),
			onCertifiedError: ({ error }) => this.postMessageWalletError(error),
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
		const statuses = response.reduce(
			(acc, { id, status }) => ({
				...acc,
				...(nonNullish(status) && { [`${id}`]: status })
			}),
			{} as BtcWithdrawalStatuses
		);

		const data: CertifiedData<BtcWithdrawalStatuses> = {
			certified,
			data: statuses
		};

		this.timer.postMsg<PostMessageDataResponseCkBTCWallet>({
			msg: 'syncBtcStatuses',
			data: {
				statuses: JSON.stringify(data, jsonReplacer)
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
