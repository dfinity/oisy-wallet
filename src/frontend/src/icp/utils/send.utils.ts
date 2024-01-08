import { CKBTC_LEDGER_CANISTER_ID } from '$icp/constants/icrc.constants';
import type { IcToken } from '$icp/types/ic';
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

export const isNetworkUsingCkBtcLedger = ({ ledgerCanisterId }: IcToken): boolean =>
	ledgerCanisterId === CKBTC_LEDGER_CANISTER_ID;
