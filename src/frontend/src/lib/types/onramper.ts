// The list of networks that are supported by Onramper can be found here:
// https://docs.onramper.com/docs/network-support
export type OnramperNetworkId = 'icp' | 'bitcoin' | 'ethereum';

// The list of cryptocurrencies that are supported by Onramper can be found here:
// https://docs.onramper.com/docs/crypto-asset-support
export type OnramperId = string;

export type OnramperFiatId = 'usd' | 'eur' | 'gbp' | 'chf';

export type OnRamperMode = 'buy';

export interface OnramperCryptoWallet {
	cryptoId: OnramperId;
	wallet: string;
}
