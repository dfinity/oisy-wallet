import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import {
	CKBTC_LEDGER_CANISTER_IDS,
	CKERC20_LEDGER_CANISTER_IDS,
	CKETH_LEDGER_CANISTER_IDS
} from '$env/networks/networks.icrc.env';
import type { IcToken } from '$icp/types/ic-token';
import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import type { CanisterIdText } from '$lib/types/canister';
import type { NetworkId } from '$lib/types/network';
import type { TokenStandard } from '$lib/types/token';
import { invalidIcpAddress, isEthAddress } from '$lib/utils/account.utils';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';
import { isInvalidDestinationBtc } from '$lib/utils/send.utils';
import { nonNullish } from '@dfinity/utils';

const isTokenLedger = ({
	token: { ledgerCanisterId },
	ledgerCanisterIds
}: {
	token: Partial<IcToken>;
	ledgerCanisterIds: CanisterIdText[];
}): boolean => nonNullish(ledgerCanisterId) && ledgerCanisterIds.includes(ledgerCanisterId);

export const isTokenCkBtcLedger = (token: Partial<IcToken>): boolean =>
	isTokenLedger({ token, ledgerCanisterIds: CKBTC_LEDGER_CANISTER_IDS });

export const isTokenCkEthLedger = (token: Partial<IcToken>): boolean =>
	isTokenLedger({ token, ledgerCanisterIds: CKETH_LEDGER_CANISTER_IDS });

export const isTokenCkErc20Ledger = (token: Partial<IcToken>): boolean =>
	isTokenLedger({ token, ledgerCanisterIds: CKERC20_LEDGER_CANISTER_IDS });

export const isNetworkIdETHMainnet = (networkId: NetworkId | undefined): boolean =>
	ETHEREUM_NETWORK_ID === networkId;

export const isNetworkIdETH = (networkId: NetworkId | undefined): boolean =>
	nonNullish(networkId) && isNetworkIdEthereum(networkId);

export const isInvalidDestinationIc = ({
	destination,
	tokenStandard,
	networkId
}: {
	destination: string;
	tokenStandard: TokenStandard;
	networkId?: NetworkId;
}): boolean => {
	if (isNullishOrEmpty(destination)) {
		return false;
	}

	if (isNetworkIdBitcoin(networkId)) {
		return isInvalidDestinationBtc({ destination, networkId });
	}

	if (nonNullish(networkId) && isNetworkIdEthereum(networkId)) {
		return !isEthAddress(destination);
	}

	if (isTokenIcrc({ standard: tokenStandard })) {
		return invalidIcrcAddress(destination);
	}

	return invalidIcpAddress(destination) && invalidIcrcAddress(destination);
};
