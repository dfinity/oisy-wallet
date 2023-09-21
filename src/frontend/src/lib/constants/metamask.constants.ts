import { Utils } from 'alchemy-sdk';
import { parseToken } from '$lib/utils/parse.utils';

// We initiate an Ethereum send transaction in Metamask with a default value of 0.05E
export const METAMASK_DEFAULT_TRANSFER_AMOUNT = Utils.hexlify(parseToken({ value: '0.05' }));