import { minterInfo } from '$icp/api/cketh-minter.api';
import { CKETH_MINTER_INFO_TIMER } from '$icp/constants/cketh.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$icp/schedulers/scheduler';
import { queryAndUpdate } from '$lib/actors/query.ic';
import type {
	PostMessageDataRequestIcCk,
	PostMessageDataResponseError,
	PostMessageJsonDataResponse
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { MinterInfo } from '@dfinity/cketh';
import { assertNonNullish, jsonReplacer } from '@dfinity/utils';

export class CkETHMinterInfoScheduler implements Scheduler<PostMessageDataRequestIcCk> {
	private timer = new SchedulerTimer('syncCktcMinterInfoStatus');

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestIcCk | undefined) {
		await this.timer.start<PostMessageDataRequestIcCk>({
			interval: CKETH_MINTER_INFO_TIMER,
			job: this.syncWallet,
			data
		});
	}

	async trigger(data: PostMessageDataRequestIcCk | undefined) {
		await this.timer.trigger<PostMessageDataRequestIcCk>({
			job: this.syncWallet,
			data
		});
	}

	private syncWallet = async ({ identity, data }: SchedulerJobData<PostMessageDataRequestIcCk>) => {
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
			msg: 'syncCkEthMinterInfo',
			data: {
				json: JSON.stringify(data, jsonReplacer)
			}
		});
	};

	private postMessageWalletError(error: unknown) {
		this.timer.postMsg<PostMessageDataResponseError>({
			msg: 'syncCkEthMinterInfoError',
			data: {
				error
			}
		});
	}
}
