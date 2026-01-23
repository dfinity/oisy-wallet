import { KASPA_MAINNET_TOKEN } from '$env/tokens/tokens.kaspa.env';
import { KASPA_WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import { retryWithDelay } from '$lib/services/rest.services';
import type { OptionIdentity } from '$lib/types/identity';
import type {
	PostMessageCommon,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { Option } from '$lib/types/utils';
import { getKaspaBalance, getKaspaTransactions } from '$kaspa/providers/kaspa-api.providers';
import type { KaspaCertifiedTransaction } from '$kaspa/stores/kaspa-transactions.store';
import type { KaspaAddress } from '$kaspa/types/address';
import type { KaspaTransaction } from '$kaspa/types/kaspa-api';
import type {
	KaspaPostMessageDataResponseWallet,
	PostMessageDataRequestKaspa
} from '$kaspa/types/kaspa-post-message';
import type { KaspaTransactionUi } from '$kaspa/types/kaspa-transaction';
import type { KaspaNetworkType } from '$kaspa/providers/kaspa-api.providers';
import { assertNonNullish, isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';

interface LoadKaspaWalletParams {
	identity: OptionIdentity;
	kaspaNetwork: KaspaNetworkType;
	address: KaspaAddress;
}

interface KaspaWalletStore {
	balance: CertifiedData<Option<bigint>> | undefined;
	transactions: Record<string, KaspaCertifiedTransaction>;
}

interface KaspaWalletData {
	balance: CertifiedData<bigint | null>;
	transactions: KaspaCertifiedTransaction[];
}

/**
 * Map API transaction to UI transaction format
 */
const mapTransactionToUi = (
	tx: KaspaTransaction,
	address: KaspaAddress
): KaspaTransactionUi => {
	// Determine if this is a send or receive transaction
	const isReceive = tx.outputs.some(
		(output) => output.verboseData?.scriptPublicKeyAddress === address
	);

	// Calculate value for this address
	let value = 0n;
	for (const output of tx.outputs) {
		if (output.verboseData?.scriptPublicKeyAddress === address) {
			value += BigInt(output.amount);
		}
	}

	// Get the from address (simplified - in real impl would need to look up input addresses)
	const fromAddress = address;

	// Get all recipient addresses (Kaspa uses UTXO model, can have multiple outputs)
	const toAddresses = tx.outputs
		.map((output) => output.verboseData?.scriptPublicKeyAddress)
		.filter((addr): addr is KaspaAddress => nonNullish(addr));

	return {
		id: tx.transactionId,
		type: isReceive ? 'receive' : 'send',
		status: tx.is_accepted ? 'confirmed' : 'pending',
		value,
		from: fromAddress,
		to: toAddresses.length > 0 ? toAddresses : undefined,
		timestamp: tx.block_time ? BigInt(tx.block_time) * 1000n : undefined,
		blueScore: tx.accepting_block_blue_score
	};
};

export class KaspaWalletScheduler implements Scheduler<PostMessageDataRequestKaspa> {
	#ref: PostMessageCommon['ref'] | undefined;

	private timer = new SchedulerTimer('syncKaspaWalletStatus');

	private store: KaspaWalletStore = {
		balance: undefined,
		transactions: {}
	};

	stop() {
		this.timer.stop();
	}

	protected setRef(data: PostMessageDataRequestKaspa | undefined) {
		this.#ref = nonNullish(data)
			? `${KASPA_MAINNET_TOKEN.symbol}-${data.kaspaNetwork}`
			: undefined;
	}

	async start(data: PostMessageDataRequestKaspa | undefined) {
		this.setRef(data);

		await this.timer.start<PostMessageDataRequestKaspa>({
			interval: KASPA_WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncWallet,
			data
		});
	}

	async trigger(data: PostMessageDataRequestKaspa | undefined) {
		await this.timer.trigger<PostMessageDataRequestKaspa>({
			job: this.syncWallet,
			data
		});
	}

	private loadBalance = async ({
		address,
		kaspaNetwork: network
	}: LoadKaspaWalletParams): Promise<CertifiedData<bigint | null>> => ({
		data: await getKaspaBalance({ address, network }),
		certified: false
	});

	private loadTransactions = async ({
		kaspaNetwork: network,
		address
	}: LoadKaspaWalletParams): Promise<KaspaCertifiedTransaction[]> => {
		const transactions = await getKaspaTransactions({
			network,
			address,
			limit: 50
		});

		const transactionsUi = transactions.map((transaction) => ({
			data: mapTransactionToUi(transaction, address),
			certified: false
		}));

		return transactionsUi.filter(({ data: { id } }) => isNullish(this.store.transactions[`${id}`]));
	};

	private loadAndSyncWalletData = async ({
		identity,
		data
	}: Required<SchedulerJobData<PostMessageDataRequestKaspa>>) => {
		const {
			address: { data: address },
			...rest
		} = data;

		const [balance, transactions] = await Promise.all([
			this.loadBalance({
				identity,
				address,
				...rest
			}),
			this.loadTransactions({
				identity,
				address,
				...rest
			})
		]);

		this.syncWalletData({ response: { balance, transactions } });
	};

	private syncWallet = async ({ identity, data }: SchedulerJobData<PostMessageDataRequestKaspa>) => {
		assertNonNullish(data, 'No data provided to get Kaspa balance.');

		try {
			await retryWithDelay({
				request: async () => await this.loadAndSyncWalletData({ identity, data }),
				maxRetries: 10
			});
		} catch (error: unknown) {
			this.postMessageWalletError({ error });
		}
	};

	private syncWalletData = ({
		response: { balance, transactions }
	}: {
		response: KaspaWalletData;
	}) => {
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
						(acc, transaction) => ({
							...acc,
							[transaction.data.id]: transaction
						}),
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

	private postMessageWallet(data: KaspaPostMessageDataResponseWallet) {
		if (isNullish(this.#ref)) {
			return;
		}

		this.timer.postMsg<KaspaPostMessageDataResponseWallet>({
			ref: this.#ref,
			msg: 'syncKaspaWallet',
			data
		});
	}

	protected postMessageWalletError({ error }: { error: unknown }) {
		if (isNullish(this.#ref)) {
			return;
		}

		this.timer.postMsg<PostMessageDataResponseError>({
			ref: this.#ref,
			msg: 'syncKaspaWalletError',
			data: {
				error
			}
		});
	}
}
