import { Utils } from 'alchemy-sdk';

// We initiate an Ethereum send transaction in Metamask with a default value of 0.05E
export const METAMASK_DEFAULT_TRANSFER_AMOUNT = Utils.parseEther(`${0.05}`);
