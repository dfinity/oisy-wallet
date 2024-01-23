import { BtcNetwork } from '@dfinity/ckbtc';

export const BTC_NETWORK: BtcNetwork =
	import.meta.env.VITE_BTC_NETWORK === 'testnet' ? BtcNetwork.Testnet : BtcNetwork.Mainnet;

export const BTC_NETWORK_SYMBOL = 'BTC';

export const BTC_NETWORK_ID = Symbol(BTC_NETWORK_SYMBOL);

// On mainnet, the ckBTC Index canister polls new transactions event two seconds.
// By delaying such an action as reloading the transactions, we can optimistically try to fetch the last transaction(s).
// Useful for example when a user send ckBTC to ckBTC.
export const CKBTC_TRANSACTIONS_RELOAD_DELAY = 4000;
