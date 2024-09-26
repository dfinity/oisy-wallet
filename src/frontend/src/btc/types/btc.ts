import type { BitcoinNetwork as BitcoinNetworkLib } from '@dfinity/ckbtc';

export type BitcoinNetwork = BitcoinNetworkLib | 'regtest';
