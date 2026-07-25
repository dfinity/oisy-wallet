import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { WALLET_PAGINATION, XRP_WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import { retryWithDelay } from '$lib/services/rest.services';
import type {
	PostMessageCommon,
	PostMessageDataRequestXrp,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import { loadXrpBalance, loadXrpTransactions } from '$xrp/api/xrpl.api';
import type { XrpCertifiedTransaction } from '$xrp/stores/xrp-transactions.store';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpPostMessageDataResponseWallet } from '$xrp/types/xrp-post-message';
import { mapXrpTransaction } from '$xrp/utils/xrp-transaction.utils';
import { assertNonNullish, isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';

interface XrpWalletStore {
	balance: CertifiedData<Nullish<XrpBalance>> | undefined;
	transactions: Record<string, XrpCertifiedTransaction>;
}

interface XrpWalletData {
	balance: CertifiedData<XrpBalance | null>;
	transactions: XrpCertifiedTransaction[];
}

export class XrpWalletScheduler implements Scheduler<PostMessageDataRequestXrp> {
	#ref: PostMessageCommon['ref'] | undefined;

	private timer = new SchedulerTimer('syncXrpWalletStatus');

	private store: XrpWalletStore = {
		balance: undefined,
		transactions: {}
	};

	stop() {
		this.timer.stop();
	}

	protected setRef(data: PostMessageDataRequestXrp | undefined) {
		const newRef = nonNullish(data) ? `${XRP_TOKEN.symbol}-${data.xrpNetwork}` : undefined;

		if (this.#ref !== newRef) {
			this.store = {
				balance: undefined,
				transactions: {}
			};
		}

		this.#ref = newRef;
	}

	async start(data: PostMessageDataRequestXrp | undefined) {
		this.setRef(data);

		await this.timer.start<PostMessageDataRequestXrp>({
			interval: XRP_WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncWallet,
			data
		});
	}

	async trigger(data: PostMessageDataRequestXrp | undefined) {
		this.setRef(data);

		await this.timer.trigger<PostMessageDataRequestXrp>({
			job: this.syncWallet,
			data
		});
	}

	private loadBalance = async ({
		address,
		xrpNetwork
	}: {
		address: PostMessageDataRequestXrp['address']['data'];
		xrpNetwork: PostMessageDataRequestXrp['xrpNetwork'];
	}): Promise<CertifiedData<XrpBalance | null>> => ({
		data: await loadXrpBalance({ address, network: xrpNetwork }),
		certified: false
	});

	// Returns only transactions not already emitted, so a re-sync posts just the delta.
	// `account_tx` returns newest-first; the store keeps them keyed by transaction hash.
	private loadTransactions = async ({
		address,
		xrpNetwork
	}: {
		address: PostMessageDataRequestXrp['address']['data'];
		xrpNetwork: PostMessageDataRequestXrp['xrpNetwork'];
	}): Promise<XrpCertifiedTransaction[]> => {
		const { transactions } = await loadXrpTransactions({
			address,
			network: xrpNetwork,
			limit: Number(WALLET_PAGINATION)
		});

		return transactions
			.map((transaction) => mapXrpTransaction({ transaction, xrpAddress: address }))
			.filter(nonNullish)
			.filter(({ id }) => isNullish(this.store.transactions[id]))
			.map((data) => ({ data, certified: false }));
	};

	private loadAndSyncWalletData = async ({ data }: { data: PostMessageDataRequestXrp }) => {
		const {
			address: { data: address },
			xrpNetwork
		} = data;

		const [balance, transactions] = await Promise.all([
			this.loadBalance({ address, xrpNetwork }),
			this.loadTransactions({ address, xrpNetwork })
		]);

		this.syncWalletData({ balance, transactions });
	};

	private syncWallet = async ({ data }: SchedulerJobData<PostMessageDataRequestXrp>) => {
		assertNonNullish(data, 'No data provided to get XRP balance.');

		try {
			await retryWithDelay({
				request: async () => await this.loadAndSyncWalletData({ data }),
				maxRetries: 10
			});
		} catch (error: unknown) {
			// Mirror the listener-side UI reset; otherwise the next sync only emits deltas and the UI stays empty.
			this.store = {
				balance: undefined,
				transactions: {}
			};
			this.postMessageWalletError({ error });
		}
	};

	private syncWalletData = ({ balance, transactions }: XrpWalletData) => {
		if (!this.store.balance?.certified && balance.certified) {
			throw new Error('Balance certification status cannot change from uncertified to certified');
		}

		const newBalance = isNullish(this.store.balance) || this.store.balance.data !== balance.data;
		const newTransactions = transactions.length > 0;

		this.store = {
			...this.store,
			...(newBalance && { balance }),
			...(newTransactions && {
				transactions: {
					...this.store.transactions,
					...transactions.reduce(
						(acc, transaction) => ({ ...acc, [transaction.data.id]: transaction }),
						{}
					)
				}
			})
		};

		if (!newBalance && !newTransactions) {
			return;
		}

		this.postMessageWallet({
			wallet: {
				balance,
				newTransactions: JSON.stringify(transactions, jsonReplacer)
			}
		});
	};

	private postMessageWallet(data: XrpPostMessageDataResponseWallet) {
		if (isNullish(this.#ref)) {
			return;
		}

		this.timer.postMsg<XrpPostMessageDataResponseWallet>({
			ref: this.#ref,
			msg: 'syncXrpWallet',
			data
		});
	}

	protected postMessageWalletError({ error }: { error: unknown }) {
		if (isNullish(this.#ref)) {
			return;
		}

		this.timer.postMsg<PostMessageDataResponseError>({
			ref: this.#ref,
			msg: 'syncXrpWalletError',
			data: {
				error
			}
		});
	}
}
