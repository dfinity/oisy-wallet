import { BTC_NETWORK_ID } from '$icp/constants/ckbtc.constants';
import { CKBTC_LEDGER_CANISTER_ID } from '$icp/constants/icrc.constants';
import type { IcToken } from '$icp/types/ic';
import type { NetworkId } from '$lib/types/network';
import { parseBtcAddress, type BtcAddress } from '@dfinity/ckbtc';
import { isNullish } from '@dfinity/utils';

export const isBtcAddress = (address: BtcAddress | undefined): boolean => {
	if (isNullish(address)) {
		return false;
	}

	try {
		parseBtcAddress(address);
		return true;
	} catch (_: unknown) {
		return false;
	}
};

export const invalidBtcAddress = (address: BtcAddress | undefined): boolean =>
	!isBtcAddress(address);

export const isNetworkUsingCkBtcLedger = ({ ledgerCanisterId }: IcToken): boolean =>
	ledgerCanisterId === CKBTC_LEDGER_CANISTER_ID;

export const isNetworkIdBTC = (networkId: NetworkId | undefined): boolean =>
	networkId === BTC_NETWORK_ID;
