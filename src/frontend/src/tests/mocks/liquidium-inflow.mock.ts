import { hexStringToUint8Array } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

// Liquidium's USDT pool.
export const mockLiquidiumUsdtPoolId = 'hnnn4-iyaaa-aaaar-qb4bq-cai';

// A Liquidium profile, in the shape of the ones Liquidium assigns: 17 bytes.
export const mockLiquidiumProfileId = Principal.fromUint8Array(
	hexStringToUint8Array('0000000000000000000000000000000102')
);

// The subaccounts of a pool that credit a supply and a repayment to that profile, laid out as the
// Liquidium client writes them into the deposits it sends to the ck deposit helper.
export const mockLiquidiumSupplySubaccount = hexStringToUint8Array(
	'0100110000000000000000000000000000000102000000000000000000000000'
);

export const mockLiquidiumRepaySubaccount = hexStringToUint8Array(
	'0200110000000000000000000000000000000102000000000000000000000000'
);
