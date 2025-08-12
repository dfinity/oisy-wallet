import { browser } from '$app/environment';
import type { BtcCertifiedTransactionsData } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import { BTC_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_SYMBOL } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_SYMBOL } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_SYMBOL } from '$env/networks/networks.sol.env';
import type { EthCertifiedTransactionsData } from '$eth/stores/eth-transactions.store';
import type { IcCertifiedTransactionsData } from '$icp/stores/ic-transactions.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { nullishSignOut } from '$lib/services/auth.services';
import type {
	GetIdbTransactionsParams,
	IdbTransactionsStoreData,
	SetIdbTransactionsParams
} from '$lib/types/idb-transactions';
import type { Transaction } from '$lib/types/transaction';
import { delMultiKeysByPrincipal } from '$lib/utils/idb.utils';
import type { SolCertifiedTransactionsData } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { Principal } from '@dfinity/principal';
import { isNullish } from '@dfinity/utils';
import { clear, createStore, get, set as idbSet, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG. Since this initialization occurs at the module's root, SvelteKit would encounter an error during the dapp bundling process, specifically a "ReferenceError [Error]: indexedDB is not defined". Therefore, the object for bundling on NodeJS side.
const idbTransactionsStore = (key: string): UseStore =>
	browser
		? createStore(`oisy-${key}-transactions`, `${key}-transactions`)
		: ({} as unknown as UseStore);

const idbBtcTransactionsStore = idbTransactionsStore(BTC_MAINNET_NETWORK_SYMBOL.toLowerCase());
const idbEthTransactionsStore = idbTransactionsStore(ETHEREUM_NETWORK_SYMBOL.toLowerCase());
const idbIcTransactionsStore = idbTransactionsStore(ICP_NETWORK_SYMBOL.toLowerCase());
const idbSolTransactionsStore = idbTransactionsStore(SOLANA_MAINNET_NETWORK_SYMBOL.toLowerCase());

const toKey = ({ principal, tokenId, networkId }: GetIdbTransactionsParams): IDBValidKey[] => [
	principal.toText(),
	`${tokenId.description}`,
	`${networkId.description}`
];

export const setIdbTransactionsStore = async <T extends IdbTransactionsStoreData>({
	identity,
	tokens,
	transactionsStoreData,
	idbTransactionsStore
}: SetIdbTransactionsParams<T> & { idbTransactionsStore: UseStore }) => {
	if (isNullish(identity)) {
		await nullishSignOut();
		return;
	}

	// We don't necessarily need this function to work, it is just a cache-saving service. Useful but not critical. We can ignore errors.
	await Promise.allSettled(
		tokens.map(async ({ id: tokenId, network: { id: networkId } }) => {
			const transactions = transactionsStoreData?.[tokenId];

			if (isNullish(transactions)) {
				return;
			}

			const key: IDBValidKey[] = toKey({ principal: identity.getPrincipal(), tokenId, networkId });

			await idbSet(
				key,
				transactions.map((transaction) => ('data' in transaction ? transaction.data : transaction)),
				idbTransactionsStore
			);
		})
	);
};

export const setIdbBtcTransactions = (
	params: SetIdbTransactionsParams<BtcCertifiedTransactionsData>
): Promise<void> =>
	setIdbTransactionsStore({ ...params, idbTransactionsStore: idbBtcTransactionsStore });

export const setIdbEthTransactions = (
	params: SetIdbTransactionsParams<EthCertifiedTransactionsData>
): Promise<void> =>
	setIdbTransactionsStore({ ...params, idbTransactionsStore: idbEthTransactionsStore });

export const setIdbIcTransactions = (
	params: SetIdbTransactionsParams<IcCertifiedTransactionsData>
): Promise<void> =>
	setIdbTransactionsStore({ ...params, idbTransactionsStore: idbIcTransactionsStore });

export const setIdbSolTransactions = (
	params: SetIdbTransactionsParams<SolCertifiedTransactionsData>
): Promise<void> =>
	setIdbTransactionsStore({ ...params, idbTransactionsStore: idbSolTransactionsStore });

export const getIdbBtcTransactions = (
	params: GetIdbTransactionsParams
): Promise<BtcTransactionUi[] | undefined> => get(toKey(params), idbBtcTransactionsStore);

export const getIdbEthTransactions = (
	params: GetIdbTransactionsParams
): Promise<Transaction[] | undefined> => get(toKey(params), idbEthTransactionsStore);

export const getIdbIcTransactions = (
	params: GetIdbTransactionsParams
): Promise<IcTransactionUi[] | undefined> => get(toKey(params), idbIcTransactionsStore);

export const getIdbSolTransactions = (
	params: GetIdbTransactionsParams
): Promise<SolTransactionUi[] | undefined> => get(toKey(params), idbSolTransactionsStore);

export const deleteIdbBtcTransactions = (principal: Principal): Promise<void> =>
	delMultiKeysByPrincipal({ principal, store: idbBtcTransactionsStore });

export const deleteIdbEthTransactions = (principal: Principal): Promise<void> =>
	delMultiKeysByPrincipal({ principal, store: idbEthTransactionsStore });

export const deleteIdbIcTransactions = (principal: Principal): Promise<void> =>
	delMultiKeysByPrincipal({ principal, store: idbIcTransactionsStore });

export const deleteIdbSolTransactions = (principal: Principal): Promise<void> =>
	delMultiKeysByPrincipal({ principal, store: idbSolTransactionsStore });

export const clearIdbBtcTransactions = (): Promise<void> => clear(idbBtcTransactionsStore);

export const clearIdbEthTransactions = (): Promise<void> => clear(idbEthTransactionsStore);

export const clearIdbIcTransactions = (): Promise<void> => clear(idbIcTransactionsStore);

export const clearIdbSolTransactions = (): Promise<void> => clear(idbSolTransactionsStore);
