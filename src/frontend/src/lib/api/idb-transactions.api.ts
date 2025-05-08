import { browser } from '$app/environment';
import type { BtcTransactionUi } from '$btc/types/btc';
import { BTC_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_SYMBOL } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_SYMBOL } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks.sol.env';
import type { EthTransactionsData } from '$eth/stores/eth-transactions.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { nullishSignOut } from '$lib/services/auth.services';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TransactionsData } from '$lib/stores/transactions.store';
import type {
	IdbTransactionsStoreData,
	SetIdbTransactionsParams
} from '$lib/types/idb-transactions';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { isNullish } from '@dfinity/utils';
import { createStore, set as idbSet, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG. Since this initialization occurs at the module's root, SvelteKit would encounter an error during the dapp bundling process, specifically a "ReferenceError [Error]: indexedDB is not defined". Therefore, the object for bundling on NodeJS side.
const idbTransactionsStore = (key: string): UseStore =>
	browser
		? createStore(`oisy-${key}-transactions`, `${key}-transactions`)
		: ({} as unknown as UseStore);

const idbBtcTransactionsStore = idbTransactionsStore(BTC_MAINNET_NETWORK_SYMBOL.toLowerCase());
const idbEthTransactionsStore = idbTransactionsStore(ETHEREUM_NETWORK_SYMBOL.toLowerCase());
const idbIcTransactionsStore = idbTransactionsStore(ICP_NETWORK_SYMBOL.toLowerCase());
const idbSolTransactionsStore = idbTransactionsStore(SOLANA_MAINNET_NETWORK_SYMBOL.toLowerCase());

export const setIdbTransactionsStore = async <T extends IdbTransactionsStoreData>({
	identity,
	tokenId,
	networkId,
	transactionsStoreData,
	idbTransactionsStore
}: SetIdbTransactionsParams<T> & {
	idbTransactionsStore: UseStore;
}) => {
	if (isNullish(identity)) {
		await nullishSignOut();
		return;
	}

	const transactions = transactionsStoreData?.[tokenId];

	if (isNullish(transactions)) {
		return;
	}

	const key: IDBValidKey[] = [
		identity.getPrincipal().toText(),
		tokenId.description ?? '',
		networkId.description ?? ''
	];

	await idbSet(
		key,
		transactions.map((transaction) => ('data' in transaction ? transaction.data : transaction)),
		idbTransactionsStore
	);
};

export const setIdbBtcTransactions = (
	params: SetIdbTransactionsParams<CertifiedStoreData<TransactionsData<BtcTransactionUi>>>
): Promise<void> =>
	setIdbTransactionsStore({ ...params, idbTransactionsStore: idbBtcTransactionsStore });

export const setIdbEthTransactions = (
	params: SetIdbTransactionsParams<EthTransactionsData>
): Promise<void> =>
	setIdbTransactionsStore({ ...params, idbTransactionsStore: idbEthTransactionsStore });

export const setIdbIcTransactions = (
	params: SetIdbTransactionsParams<CertifiedStoreData<TransactionsData<IcTransactionUi>>>
): Promise<void> =>
	setIdbTransactionsStore({ ...params, idbTransactionsStore: idbIcTransactionsStore });

export const setIdbSolTransactions = (
	params: SetIdbTransactionsParams<CertifiedStoreData<TransactionsData<SolTransactionUi>>>
): Promise<void> =>
	setIdbTransactionsStore({ ...params, idbTransactionsStore: idbSolTransactionsStore });
