import { SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import { BtcNetwork } from '@dfinity/ckbtc';

export const BTC_NETWORK: BtcNetwork =
	import.meta.env.VITE_BTC_NETWORK === 'testnet' ? BtcNetwork.Testnet : BtcNetwork.Mainnet;

export const BTC_NETWORK_SYMBOL = 'BTC';

export const BTC_NETWORK_ID = Symbol(BTC_NETWORK_SYMBOL);

export const BTC_DECIMALS = 8;

// Worker refresh rate
export const BTC_STATUSES_TIMER_INTERVAL_MILLIS = SECONDS_IN_MINUTE * 1000; // 1 minute in milliseconds
export const CKBTC_UPDATE_BALANCE_TIMER_INTERVAL_MILLIS = SECONDS_IN_MINUTE * 1000; // 1 minute in milliseconds
