export type CryptoId = string;

export type FiatId = string;

export type CryptoNetworkId = string;

export type OnRamperMode = 'buy';

export type CryptoWallet = {
	cryptoId: CryptoId;
	wallet: string;
};
