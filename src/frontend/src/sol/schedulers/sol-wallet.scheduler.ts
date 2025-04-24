import { SOL_WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type { SolAddress } from '$lib/types/address';
import type {
	PostMessageDataRequestSol,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { Option } from '$lib/types/utils';
import { loadSolLamportsBalance } from '$sol/api/solana.api';
import { loadSplTokenBalance } from '$sol/services/spl-accounts.services';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolBalance } from '$sol/types/sol-balance';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import type { SplTokenAddress } from '$sol/types/spl';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';

interface LoadSolWalletParams {
	solanaNetwork: SolanaNetworkType;
	address: SolAddress;
	tokenAddress?: SplTokenAddress;
	tokenOwnerAddress?: SolAddress;
}

interface SolWalletStore {
	balance: CertifiedData<Option<SolBalance>> | undefined;
}

interface SolWalletData {
	balance: CertifiedData<SolBalance | null>;
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
			interval: SOL_WALLET_TIMER_INTERVAL_MILLIS,
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
		solanaNetwork: network,
		tokenAddress,
		tokenOwnerAddress
	}: LoadSolWalletParams): Promise<CertifiedData<SolBalance | null>> => ({
		data:
			nonNullish(tokenAddress) && nonNullish(tokenOwnerAddress)
				? await loadSplTokenBalance({
						address,
						network,
						tokenAddress,
						tokenOwnerAddress
					})
				: await loadSolLamportsBalance({ address, network }),
		certified: false
	});

	private syncWallet = async ({ data }: SchedulerJobData<PostMessageDataRequestSol>) => {
		assertNonNullish(data, 'No data provided to get Solana balance.');

		try {
			const {
				address: { data: address },
				...rest
			} = data;

			const balance = await this.loadBalance({
				address,
				...rest
			});

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

		this.store = {
			...this.store,
			...(newBalance && { balance })
		};

		if (!newBalance) {
			return;
		}

		this.postMessageWallet({ wallet: { balance } });
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
