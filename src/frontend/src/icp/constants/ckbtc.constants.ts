import { BtcNetwork } from '@dfinity/ckbtc';

export const BTC_NETWORK: BtcNetwork =
	import.meta.env.VITE_BTC_NETWORK === 'testnet' ? BtcNetwork.Testnet : BtcNetwork.Mainnet;

export const BTC_NETWORK_SYMBOL = 'BTC';

export const BTC_NETWORK_ID = Symbol(BTC_NETWORK_SYMBOL);

export const BTC_DECIMALS = 8;

// Worker refresh rate
export const BTC_STATUSES_TIMER_INTERVAL_MILLIS = 'disabled';
export const CKBTC_UPDATE_BALANCE_TIMER_INTERVAL_MILLIS = 60000;
export const CKBTC_MINTER_INFO_TIMER = 'disabled';
