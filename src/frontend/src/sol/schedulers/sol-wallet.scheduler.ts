import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type { SolAddress } from '$lib/types/address';
import type { Balance } from '$lib/types/balance';
import type { PostMessageDataResponseError } from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { Token } from '$lib/types/token';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import { assertNonNullish, isNullish } from '@dfinity/utils';

interface LoadSolWalletParams {
	token: Token;
	address: SolAddress;
}
interface SolWalletStore {
	balance: CertifiedData<Balance | null> | undefined;
}

interface SolWalletData {
	balance: CertifiedData<Balance | null>;
}

export class SolWalletScheduler implements Scheduler<PostMessageDataRequestSol> {
	private timer = new SchedulerTimer('syncSolWalletStatus');

	private store: SolWalletStore = {
		balance: undefined
	};

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestSol | undefined) {
		await this.timer.start<PostMessageDataRequestSol>({
			interval: WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncWallet,
			data
		});
	}

	async trigger(data: PostMessageDataRequestSol | undefined) {
		await this.timer.trigger<PostMessageDataRequestSol>({
			job: this.syncWallet,
			data
		});
	}

	private loadBalance = async (
		params: LoadSolWalletParams
	): Promise<CertifiedData<Balance | null>> => ({
		data: await loadSolBalance(params),
		certified: true
	});

	private syncWallet = async ({ data }: SchedulerJobData<PostMessageDataRequestSol>) => {
		assertNonNullish(data, 'No data provided to get Solana balance.');
		const {
			token,
			address: { data: address }
		} = data;

		try {
			const balance = await this.loadBalance({ address, token });

			this.syncWalletData({ response: { balance } });
		} catch (error: unknown) {
			this.postMessageWalletError({ error });
		}
	};

	private syncWalletData = ({ response: { balance } }: { response: SolWalletData }) => {
		const newBalance =
			isNullish(this.store.balance) ||
			this.store.balance.data !== balance.data ||
			(!this.store.balance.certified && balance.certified);

		this.store = {
			...this.store,
			...(newBalance && { balance })
		};

		if (!newBalance) {
			return;
		}

		this.postMessageWallet({
			wallet: {
				balance
			}
		});
	};

	private postMessageWallet(data: SolPostMessageDataResponseWallet) {
		this.timer.postMsg<SolPostMessageDataResponseWallet>({
			msg: 'syncSolWallet',
			data
		});
	}

	protected postMessageWalletError({ error }: { error: unknown }) {
		this.timer.postMsg<PostMessageDataResponseError>({
			msg: 'syncSolWalletError',
			data: {
				error
			}
		});
	}
}
