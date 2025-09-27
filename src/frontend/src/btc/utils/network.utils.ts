import type { BitcoinNetwork } from '@dfinity/ckbtc';

export const isBitcoinNetworkMainnet = (bitcoinNetwork: BitcoinNetwork): boolean =>
	bitcoinNetwork === 'mainnet';

export const isBitcoinNetworkTestnet = (bitcoinNetwork: BitcoinNetwork): boolean =>
	bitcoinNetwork === 'testnet';

export const isBitcoinNetworkRegtest = (bitcoinNetwork: BitcoinNetwork): boolean =>
	bitcoinNetwork === 'regtest';
