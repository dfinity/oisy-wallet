import { minterInfo } from '$icp/api/ckbtc-minter.api';
import { CKBTC_MINTER_INFO_TIMER } from '$icp/constants/ckbtc.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$icp/schedulers/scheduler';
import { queryAndUpdate } from '$lib/actors/query.ic';
import type {
	PostMessageDataRequestIcCk,
	PostMessageDataResponseError,
	PostMessageJsonDataResponse
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { MinterInfo } from '@dfinity/ckbtc';
import { assertNonNullish, jsonReplacer } from '@dfinity/utils';

export class CkBTCMinterInfoScheduler implements Scheduler<PostMessageDataRequestIcCk> {
	private timer = new SchedulerTimer('syncCktcMinterInfoStatus');

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestIcCk | undefined) {
		await this.timer.start<PostMessageDataRequestIcCk>({
			interval: CKBTC_MINTER_INFO_TIMER,
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

		await queryAndUpdate<MinterInfo>({
			request: ({ identity: _, certified }) =>
				minterInfo({ minterCanisterId, identity, certified }),
			onLoad: ({ certified, ...rest }) => this.syncMinterInfo({ certified, ...rest }),
			onCertifiedError: ({ error }) => this.postMessageWalletError(error),
			identity,
			resolution: 'all_settled'
		});
	};

	private syncMinterInfo = ({
		response,
		certified
	}: {
		response: MinterInfo;
		certified: boolean;
	}) => {
		const data: CertifiedData<MinterInfo> = {
			certified,
			data: response
		};

		this.timer.postMsg<PostMessageJsonDataResponse>({
			msg: 'syncCktcMinterInfo',
			data: {
				json: JSON.stringify(data, jsonReplacer)
			}
		});
	};

	private postMessageWalletError(error: unknown) {
		this.timer.postMsg<PostMessageDataResponseError>({
			msg: 'syncCktcMinterInfoError',
			data: {
				error
			}
		});
	}
}
