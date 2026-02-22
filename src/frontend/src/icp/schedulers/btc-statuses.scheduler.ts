import { withdrawalStatuses } from '$icp/api/ckbtc-minter.api';
import { BTC_STATUSES_TIMER_INTERVAL_MILLIS } from '$icp/constants/ckbtc.constants';
import type { BtcWithdrawalStatuses } from '$icp/types/btc';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import { createQueryAndUpdateWithWarmup } from '$lib/services/query.services';
import type {
	PostMessageDataRequestIcCk,
	PostMessageDataResponseError,
	PostMessageJsonDataResponse
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import {
	assertNonNullish,
	isNullish,
	jsonReplacer,
	nonNullish,
	queryAndUpdate,
	type QueryAndUpdateParams
} from '@dfinity/utils';
import type { RetrieveBtcStatusV2WithId } from '@icp-sdk/canisters/ckbtc';

export class BtcStatusesScheduler implements Scheduler<PostMessageDataRequestIcCk> {
	private _queryAndUpdateWithWarmup?: ReturnType<typeof createQueryAndUpdateWithWarmup>;
	private _interval: number | 'disabled' = BTC_STATUSES_TIMER_INTERVAL_MILLIS;

	private get queryAndUpdateWithWarmup() {
		if (isNullish(this._queryAndUpdateWithWarmup)) {
			this._queryAndUpdateWithWarmup = createQueryAndUpdateWithWarmup();
		}

		return this._queryAndUpdateWithWarmup;
	}

	private timer = new SchedulerTimer('syncBtcStatusesStatus');

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestIcCk | undefined) {
		await this.timer.start<PostMessageDataRequestIcCk>({
			interval: this._interval,
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

		const params: QueryAndUpdateParams<RetrieveBtcStatusV2WithId[]> = {
			request: ({ identity: _, certified }) =>
				withdrawalStatuses({ minterCanisterId, identity, certified }),
			onLoad: ({ certified, ...rest }) => this.syncStatusesResults({ certified, ...rest }),
			onUpdateError: ({ error }) => this.postMessageWalletError(error),
			identity
		};

		// if the interval is "disabled", the sync will only be triggered once; therefore, it makes sense to do "update" only
		if (this._interval === 'disabled') {
			await queryAndUpdate<RetrieveBtcStatusV2WithId[]>({ ...params, strategy: 'update' });
		} else {
			await this.queryAndUpdateWithWarmup<RetrieveBtcStatusV2WithId[]>(params);
		}
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
