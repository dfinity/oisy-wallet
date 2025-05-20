import { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import type { SchedulerJobData, SchedulerJobParams } from '$lib/schedulers/scheduler';
import type { CertifiedData } from '$lib/types/store';
import { isNullish, queryAndUpdate } from '@dfinity/utils';

// Not reactive, only used to hold values imperatively.
interface IcrcBalanceStore {
	balance: CertifiedData<bigint> | undefined;
}

export class IcWalletBalanceScheduler<
	PostMessageDataRequest
> extends IcWalletScheduler<PostMessageDataRequest> {
	private store: IcrcBalanceStore = {
		balance: undefined
	};

	constructor(
		private getBalance: (data: SchedulerJobParams<PostMessageDataRequest>) => Promise<bigint>,
		private msg: 'syncIcpWallet' | 'syncIcrcWallet' | 'syncDip20Wallet'
	) {
		super();
	}

	/**
	 * @override
	 */
	protected syncWallet = async ({
		identity,
		...data
	}: SchedulerJobData<PostMessageDataRequest>) => {
		await queryAndUpdate<bigint>({
			request: ({ identity: _, certified }) => this.getBalance({ ...data, identity, certified }),
			onLoad: ({ certified, ...rest }) => this.syncBalance({ certified, ...rest }),
			onUpdateError: ({ error }) => this.postMessageWalletError({ msg: this.msg, error }),
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

		this.postMessageWalletBalance({
			balance,
			certified
		});
	};

	private postMessageWalletBalance({
		balance: data,
		certified
	}: {
		balance: bigint;
		certified: boolean;
	}) {
		this.postMessageWallet({
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
}
