import { BTC_NETWORK, BTC_NETWORK_ID } from '$icp/constants/ckbtc.constants';
import { CKBTC_LEDGER_CANISTER_ID } from '$icp/constants/icrc.constants';
import type { IcToken } from '$icp/types/ic';
import { invalidIcpAddress } from '$icp/utils/icp-account.utils';
import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
import type { NetworkId } from '$lib/types/network';
import type { TokenStandard } from '$lib/types/token';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
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

export const isInvalidDestinationIc = ({
	destination,
	networkId,
	tokenStandard
}: {
	destination: string;
	networkId: NetworkId | undefined;
	tokenStandard: TokenStandard;
}): boolean => {
	if (isNullishOrEmpty(destination)) {
		return false;
	}

	if (isNetworkIdBTC(networkId)) {
		return invalidBtcAddress({
			address: destination,
			network: BTC_NETWORK
		});
	}

	if (tokenStandard === 'icrc') {
		return invalidIcrcAddress(destination);
	}

	return invalidIcpAddress(destination) && invalidIcrcAddress(destination);
};
