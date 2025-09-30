import { browser } from '$app/environment';
import { ETHEREUM_NETWORK_SYMBOL } from '$env/networks/networks.eth.env';
import {
	SOLANA_DEVNET_NETWORK_SYMBOL,
	SOLANA_LOCAL_NETWORK_SYMBOL,
	SOLANA_MAINNET_NETWORK_SYMBOL
} from '$env/networks/networks.sol.env';
import { BTC_MAINNET_SYMBOL, BTC_TESTNET_SYMBOL } from '$env/tokens/tokens.btc.env';
import type { BtcAddress, EthAddress, SolAddress } from '$lib/types/address';
import type {
	IdbBtcAddress,
	IdbEthAddress,
	IdbSolAddress,
	SetIdbAddressParams
} from '$lib/types/idb-addresses';
import type { Principal } from '@dfinity/principal';
import { isNullish } from '@dfinity/utils';
import { clear, createStore, del, get, set, update, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG. Since this initialization occurs at the module's root, SvelteKit would encounter an error during the dapp bundling process, specifically a "ReferenceError [Error]: indexedDB is not defined". Therefore, the object for bundling on NodeJS side.
const idbAddressesStore = (key: string): UseStore =>
	browser ? createStore(`oisy-${key}-addresses`, `${key}-addresses`) : ({} as unknown as UseStore);

const idbBtcAddressesStoreMainnet = idbAddressesStore(BTC_MAINNET_SYMBOL.toLowerCase());
const idbBtcAddressesStoreTestnet = idbAddressesStore(BTC_TESTNET_SYMBOL.toLowerCase());

const idbEthAddressesStore = idbAddressesStore(ETHEREUM_NETWORK_SYMBOL.toLowerCase());

const idbSolAddressesStoreMainnet = idbAddressesStore(SOLANA_MAINNET_NETWORK_SYMBOL.toLowerCase());
const idbSolAddressesStoreDevnet = idbAddressesStore(SOLANA_DEVNET_NETWORK_SYMBOL.toLowerCase());
const idbSolAddressesStoreLocal = idbAddressesStore(SOLANA_LOCAL_NETWORK_SYMBOL.toLowerCase());

export const setIdbBtcAddressMainnet = ({
	address,
	principal
}: SetIdbAddressParams<BtcAddress>): Promise<void> =>
	set(principal.toText(), address, idbBtcAddressesStoreMainnet);

export const setIdbBtcAddressTestnet = ({
	address,
	principal
}: SetIdbAddressParams<BtcAddress>): Promise<void> =>
	set(principal.toText(), address, idbBtcAddressesStoreTestnet);

export const setIdbEthAddress = ({
	address,
	principal
}: SetIdbAddressParams<EthAddress>): Promise<void> =>
	set(principal.toText(), address, idbEthAddressesStore);

export const setIdbSolAddressMainnet = ({
	address,
	principal
}: SetIdbAddressParams<SolAddress>): Promise<void> =>
	set(principal.toText(), address, idbSolAddressesStoreMainnet);

export const setIdbSolAddressDevnet = ({
	address,
	principal
}: SetIdbAddressParams<SolAddress>): Promise<void> =>
	set(principal.toText(), address, idbSolAddressesStoreDevnet);

export const setIdbSolAddressLocal = ({
	address,
	principal
}: SetIdbAddressParams<SolAddress>): Promise<void> =>
	set(principal.toText(), address, idbSolAddressesStoreLocal);

const updateIdbAddressLastUsage = ({
	principal,
	idbAddressesStore
}: {
	principal: Principal;
	idbAddressesStore: UseStore;
}): Promise<void> =>
	update(
		principal.toText(),
		(address) => {
			if (isNullish(address)) {
				return undefined;
			}

			return {
				...address,
				lastUsedTimestamp: Date.now()
			};
		},
		idbAddressesStore
	);

export const updateIdbBtcAddressMainnetLastUsage = (principal: Principal): Promise<void> =>
	updateIdbAddressLastUsage({ principal, idbAddressesStore: idbBtcAddressesStoreMainnet });

export const updateIdbEthAddressLastUsage = (principal: Principal): Promise<void> =>
	updateIdbAddressLastUsage({ principal, idbAddressesStore: idbEthAddressesStore });

export const updateIdbSolAddressMainnetLastUsage = (principal: Principal): Promise<void> =>
	updateIdbAddressLastUsage({ principal, idbAddressesStore: idbSolAddressesStoreMainnet });

export const getIdbBtcAddressMainnet = (principal: Principal): Promise<IdbBtcAddress | undefined> =>
	get(principal.toText(), idbBtcAddressesStoreMainnet);

export const getIdbEthAddress = (principal: Principal): Promise<IdbEthAddress | undefined> =>
	get(principal.toText(), idbEthAddressesStore);

export const getIdbSolAddressMainnet = (principal: Principal): Promise<IdbSolAddress | undefined> =>
	get(principal.toText(), idbSolAddressesStoreMainnet);

export const deleteIdbBtcAddressMainnet = (principal: Principal): Promise<void> =>
	del(principal.toText(), idbBtcAddressesStoreMainnet);

export const deleteIdbEthAddress = (principal: Principal): Promise<void> =>
	del(principal.toText(), idbEthAddressesStore);

export const deleteIdbSolAddressMainnet = (principal: Principal): Promise<void> =>
	del(principal.toText(), idbSolAddressesStoreMainnet);

export const clearIdbBtcAddressMainnet = (): Promise<void> => clear(idbBtcAddressesStoreMainnet);

export const clearIdbEthAddress = (): Promise<void> => clear(idbEthAddressesStore);

export const clearIdbSolAddressMainnet = (): Promise<void> => clear(idbSolAddressesStoreMainnet);
