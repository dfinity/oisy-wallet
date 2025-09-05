import type { Currency } from '$lib/enums/currency';
import type { BtcAddress, EthAddress } from '$lib/types/address';

// The list of networks that are supported by Onramper can be found here:
// https://docs.onramper.com/docs/network-support
export type OnramperNetworkId =
	| 'icp'
	| 'bitcoin'
	| 'ethereum'
	| 'solana'
	| 'base'
	| 'bsc'
	| 'polygon'
	| 'arbitrum';

// The list of cryptocurrencies that are supported by Onramper can be found here:
// https://docs.onramper.com/docs/crypto-asset-support
export type OnramperId = string;

// The list of fiat currencies that are supported by Onramper can be found here:
// https://docs.onramper.com/docs/fiat-currency-support
// Please, cross-reference the OISY supported currencies with the Coingecko API for supported currencies.
export type OnramperFiatId = Currency;

export type OnramperMode = 'buy';

// TODO: refine the type for IC/ICRC address to be more clear
export type OnramperWalletAddress = BtcAddress | EthAddress | string;

export interface OnramperCryptoWallet {
	cryptoId: OnramperId;
	wallet: OnramperWalletAddress;
}

export interface OnramperNetworkWallet {
	networkId: OnramperNetworkId;
	wallet: OnramperWalletAddress;
}
