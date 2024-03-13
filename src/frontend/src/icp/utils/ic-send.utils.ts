import { BTC_NETWORK, BTC_NETWORK_ID } from '$icp/constants/ckbtc.constants';
import {
	CKBTC_LEDGER_CANISTER_IDS,
	CKETH_LEDGER_CANISTER_IDS
} from '$icp/constants/icrc.constants';
import type { IcToken } from '$icp/types/ic';
import { invalidIcpAddress } from '$icp/utils/icp-account.utils';
import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
import type { NetworkId } from '$lib/types/network';
import type { TokenStandard } from '$lib/types/token';
import { isEthAddress } from '$lib/utils/account.utils';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { isNetworkIdEthereum } from '$lib/utils/network.utils';
import { parseBtcAddress, type BtcAddress } from '@dfinity/ckbtc';
import { isNullish, nonNullish } from '@dfinity/utils';
import {ETHEREUM_NETWORKS_IDS} from "$icp-eth/constants/networks.constants";

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

export const isTokenCkBtcLedger = ({ ledgerCanisterId }: Partial<IcToken>): boolean =>
	nonNullish(ledgerCanisterId) && CKBTC_LEDGER_CANISTER_IDS.includes(ledgerCanisterId);

export const isTokenCkEthLedger = ({ ledgerCanisterId }: Partial<IcToken>): boolean =>
	nonNullish(ledgerCanisterId) && CKETH_LEDGER_CANISTER_IDS.includes(ledgerCanisterId);

export const isNetworkIdBTC = (networkId: NetworkId | undefined): boolean =>
	networkId === BTC_NETWORK_ID;

export const isNetworkIdETH = (networkId: NetworkId | undefined): boolean =>
	nonNullish(networkId) && isNetworkIdEthereum(networkId);

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

	if (nonNullish(networkId) && isNetworkIdEthereum(networkId)) {
		return !isEthAddress(destination);
	}

	if (tokenStandard === 'icrc') {
		return invalidIcrcAddress(destination);
	}

	return invalidIcpAddress(destination) && invalidIcrcAddress(destination);
};
