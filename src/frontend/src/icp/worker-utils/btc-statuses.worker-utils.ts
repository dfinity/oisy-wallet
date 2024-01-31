import { withdrawalStatuses } from '$icp/api/ckbtc-minter.api';
import { BTC_STATUSES_TIMER_INTERVAL_MILLIS } from '$icp/constants/ckbtc.constants';
import type { BtcWithdrawalStatuses } from '$icp/types/btc';
import {
	TimerWorkerUtils,
	type TimerWorkerUtilsJobData
} from '$icp/worker-utils/timer.worker-utils';
import { queryAndUpdate } from '$lib/actors/query.ic';
import type {
	PostMessageDataRequestBtcStatuses,
	PostMessageDataResponseBtcStatuses,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { RetrieveBtcStatusV2WithId } from '@dfinity/ckbtc';
import { assertNonNullish, jsonReplacer, nonNullish } from '@dfinity/utils';

export class BtcStatusesWorkerUtils {
	private worker = new TimerWorkerUtils();

	stop() {
		this.worker.stop();
	}

	async start(data: PostMessageDataRequestBtcStatuses | undefined) {
		await this.worker.start<PostMessageDataRequestBtcStatuses>({
			interval: BTC_STATUSES_TIMER_INTERVAL_MILLIS,
			job: this.syncStatuses,
			data
		});
	}

	async trigger(data: PostMessageDataRequestBtcStatuses | undefined) {
		await this.worker.trigger<PostMessageDataRequestBtcStatuses>({
			job: this.syncStatuses,
			data
		});
	}

	private syncStatuses = async ({
		identity,
		data
	}: TimerWorkerUtilsJobData<PostMessageDataRequestBtcStatuses>) => {
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

		this.worker.postMsg<PostMessageDataResponseBtcStatuses>({
			msg: 'syncBtcStatuses',
			data: {
				statuses: JSON.stringify(data, jsonReplacer)
			}
		});
	};

	private postMessageWalletError(error: unknown) {
		this.worker.postMsg<PostMessageDataResponseError>({
			msg: 'syncBtcStatusesError',
			data: {
				error
			}
		});
	}
}
