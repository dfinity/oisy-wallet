import { browser } from '$app/environment';
import { ETHEREUM_NETWORK_SYMBOL } from '$env/networks/networks.eth.env';
import {
	SOLANA_DEVNET_NETWORK_SYMBOL,
	SOLANA_LOCAL_NETWORK_SYMBOL,
	SOLANA_MAINNET_NETWORK_SYMBOL
} from '$env/networks/networks.sol.env';
import { BTC_MAINNET_SYMBOL, BTC_TESTNET_SYMBOL } from '$env/tokens/tokens.btc.env';
import { clear, createStore, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG. Since this initialization occurs at the module's root, SvelteKit would encounter an error during the dapp bundling process, specifically a "ReferenceError [Error]: indexedDB is not defined". Therefore, the object for bundling on NodeJS side.
const idbAddressesStore = (key: string): UseStore =>
	browser ? createStore(`oisy-${key}-addresses`, `${key}-addresses`) : ({} as unknown as UseStore);

const idbBtcAddressesStoreMainnet = idbAddressesStore(BTC_MAINNET_SYMBOL.toLowerCase());
const idbBtcAddressesStoreTestnet = idbAddressesStore(BTC_TESTNET_SYMBOL.toLowerCase());

const idbEthAddressesStore = idbAddressesStore(ETHEREUM_NETWORK_SYMBOL.toLowerCase());

const idbSolAddressesStoreMainnet = idbAddressesStore(SOLANA_MAINNET_NETWORK_SYMBOL.toLowerCase());
const idbSolAddressesStoreDevnet = idbAddressesStore(SOLANA_DEVNET_NETWORK_SYMBOL.toLowerCase());
const idbSolAddressesStoreLocal = idbAddressesStore(SOLANA_LOCAL_NETWORK_SYMBOL.toLowerCase());

export const clearIdbBtcAddressMainnet = (): Promise<void> => clear(idbBtcAddressesStoreMainnet);

export const clearIdbBtcAddressTestnet = (): Promise<void> => clear(idbBtcAddressesStoreTestnet);

export const clearIdbEthAddress = (): Promise<void> => clear(idbEthAddressesStore);

export const clearIdbSolAddressMainnet = (): Promise<void> => clear(idbSolAddressesStoreMainnet);

export const clearIdbSolAddressDevnet = (): Promise<void> => clear(idbSolAddressesStoreDevnet);

export const clearIdbSolAddressLocal = (): Promise<void> => clear(idbSolAddressesStoreLocal);
