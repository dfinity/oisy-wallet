export type CryptoId = string;

export type FiatId = string;

// The list of networks that are supported by OnRamper can be found here:
// https://docs.onramper.com/docs/network-support
export type OnRamperNetworkId = 'icp' | 'bitcoin' | 'ethereum';

export type OnRamperMode = 'buy';

export type CryptoWallet = {
	cryptoId: CryptoId;
	wallet: string;
};
