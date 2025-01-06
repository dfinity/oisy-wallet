import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type { SolAddress } from '$lib/types/address';
import type {
	PostMessageDataRequestSol,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import { loadSolLamportsBalance } from '$sol/api/solana.api';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import { assertNonNullish, isNullish } from '@dfinity/utils';

interface LoadSolWalletParams {
	solanaNetwork: SolanaNetworkType;
	address: SolAddress;
}

interface SolWalletStore {
	balance: CertifiedData<bigint | null> | undefined;
}

interface SolWalletData {
	balance: CertifiedData<bigint | null>;
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

	private loadBalance = async ({
		address,
		solanaNetwork
	}: LoadSolWalletParams): Promise<CertifiedData<bigint | null>> => ({
		data: await loadSolLamportsBalance({ network: solanaNetwork, address }),
		certified: false
	});

	private syncWallet = async ({ data }: SchedulerJobData<PostMessageDataRequestSol>) => {
		assertNonNullish(data, 'No data provided to get Solana balance.');

		try {
			const balance = await this.loadBalance({
				address: data.address.data,
				solanaNetwork: data.solanaNetwork
			});

			//todo implement loading transactions

			this.syncWalletData({ response: { balance } });
		} catch (error: unknown) {
			this.postMessageWalletError({ error });
		}
	};

	private syncWalletData = ({ response: { balance } }: { response: SolWalletData }) => {
		if (!this.store.balance?.certified && balance.certified) {
			throw new Error('Balance certification status cannot change from uncertified to certified');
		}

		const newBalance = isNullish(this.store.balance) || this.store.balance.data !== balance.data;

		if (!newBalance) {
			return;
		}

		this.store = {
			...this.store,
			balance
		};

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
