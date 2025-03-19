import type { BitcoinNetwork } from '$btc/types/network';
import {
	BTC_MAINNET_NETWORK,
	BTC_REGTEST_NETWORK,
	BTC_TESTNET_NETWORK
} from '$env/networks/networks.env';
import {
	IC_CKBTC_MINTER_CANISTER_ID,
	STAGING_CKBTC_MINTER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import type { MinterCanisterIdText } from '$icp/types/canister';
import { LOCAL } from '$lib/constants/app.constants';
import type { CanisterIdText } from '$lib/types/canister';
import type { NetworkId } from '$lib/types/network';
import { nonNullish } from '@dfinity/utils';

export const BITCOIN_CANISTER_IDS: Record<MinterCanisterIdText, CanisterIdText> = {
	...(nonNullish(STAGING_CKBTC_MINTER_CANISTER_ID) && {
		[STAGING_CKBTC_MINTER_CANISTER_ID]: 'g4xu7-jiaaa-aaaan-aaaaq-cai'
	}),
	...(nonNullish(IC_CKBTC_MINTER_CANISTER_ID) && {
		[IC_CKBTC_MINTER_CANISTER_ID]: 'ghsi2-tqaaa-aaaan-aaaca-cai'
	})
};

export const BTC_MAINNET_ENABLED =
	JSON.parse(import.meta.env.VITE_BITCOIN_MAINNET_DISABLED ?? false) === false;

const SUPPORTED_BITCOIN_NETWORKS: BitcoinNetwork[] = [
	...(BTC_MAINNET_ENABLED ? [BTC_MAINNET_NETWORK] : []),
	BTC_TESTNET_NETWORK,
	...(LOCAL ? [BTC_REGTEST_NETWORK] : [])
];

export const SUPPORTED_BITCOIN_NETWORKS_IDS: NetworkId[] = SUPPORTED_BITCOIN_NETWORKS.map(
	({ id }) => id
);
