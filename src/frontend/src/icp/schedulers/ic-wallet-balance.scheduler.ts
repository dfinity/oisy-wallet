import { queryAndUpdate } from '$lib/actors/query.ic';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import {
	SchedulerTimer,
	type Scheduler,
	type SchedulerJobData,
	type SchedulerJobParams
} from '$lib/schedulers/scheduler';
import type {
	PostMessageDataResponseError,
	PostMessageDataResponseWallet
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import { isNullish } from '@dfinity/utils';

// Not reactive, only used to hold values imperatively.
interface IcrcBalanceStore {
	balance: CertifiedData<bigint> | undefined;
}

export class IcWalletBalanceScheduler<PostMessageDataRequest>
	implements Scheduler<PostMessageDataRequest>
{
	private timer = new SchedulerTimer('syncIcWalletStatus');

	private store: IcrcBalanceStore = {
		balance: undefined
	};

	constructor(
		private getBalance: (data: SchedulerJobParams<PostMessageDataRequest>) => Promise<bigint>,
		private msg: 'syncIcpWallet' | 'syncIcrcWallet'
	) {}

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequest | undefined) {
		await this.timer.start<PostMessageDataRequest>({
			interval: WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncWallet,
			data
		});
	}

	async trigger(data: PostMessageDataRequest | undefined) {
		await this.timer.trigger<PostMessageDataRequest>({
			job: this.syncWallet,
			data
		});
	}

	private syncWallet = async ({ identity, ...data }: SchedulerJobData<PostMessageDataRequest>) => {
		await queryAndUpdate<bigint>({
			request: ({ identity: _, certified }) => this.getBalance({ ...data, identity, certified }),
			onLoad: ({ certified, ...rest }) => this.syncBalance({ certified, ...rest }),
			onCertifiedError: ({ error }) => this.postMessageWalletError(error),
			identity,
			resolution: 'all_settled'
		});
	};

	private syncBalance = ({
		response: balance,
		certified
	}: {
		response: bigint;
		certified: boolean;
	}) => {
		// Is the balance different from last value or has it become certified
		const newBalance =
			isNullish(this.store.balance) ||
			this.store.balance.data !== balance ||
			(!this.store.balance.certified && certified);

		if (!newBalance) {
			return;
		}

		this.store = {
			balance: { data: balance, certified }
		};

		this.postMessageWallet({
			balance,
			certified
		});
	};

	private postMessageWallet({ balance: data, certified }: { balance: bigint; certified: boolean }) {
		this.timer.postMsg<PostMessageDataResponseWallet>({
			msg: this.msg,
			data: {
				wallet: {
					balance: {
						data,
						certified
					}
				}
			}
		});
	}

	private postMessageWalletError(error: unknown) {
		this.timer.postMsg<PostMessageDataResponseError>({
			msg: `${this.msg}Error`,
			data: {
				error
			}
		});
	}
}
