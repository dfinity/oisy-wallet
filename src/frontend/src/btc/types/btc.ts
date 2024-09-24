import type { Token } from '$lib/types/token';
import type { BitcoinNetwork as BitcoinNetworkLib } from '@dfinity/ckbtc';

export type BtcToken = Token;

export type BitcoinNetwork = BitcoinNetworkLib | 'regtest';
