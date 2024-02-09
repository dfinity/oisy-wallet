import { minterInfo } from '$icp/api/ckbtc-minter.api';
import { CKBTC_MINTER_INFO_TIMER } from '$icp/constants/ckbtc.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$icp/schedulers/scheduler';
import { queryAndUpdate } from '$lib/actors/query.ic';
import type {
	PostMessageDataRequestCkBTCWallet,
	PostMessageDataResponseError,
	PostMessageJsonDataResponseCkBTC
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { MinterInfo } from '@dfinity/ckbtc';
import { assertNonNullish, jsonReplacer } from '@dfinity/utils';

export class CkBTCMinterInfoScheduler implements Scheduler<PostMessageDataRequestCkBTCWallet> {
	private timer = new SchedulerTimer();

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestCkBTCWallet | undefined) {
		await this.timer.start<PostMessageDataRequestCkBTCWallet>({
			interval: CKBTC_MINTER_INFO_TIMER,
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

		this.timer.postMsg<PostMessageJsonDataResponseCkBTC>({
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
