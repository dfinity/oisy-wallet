import {
	BTC_MAINNET_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID,
	ETHEREUM_NETWORK_ID
} from '$env/networks.env';
import {
	CKBTC_LEDGER_CANISTER_IDS,
	CKERC20_LEDGER_CANISTER_IDS,
	CKETH_LEDGER_CANISTER_IDS
} from '$env/networks.icrc.env';
import type { IcToken } from '$icp/types/ic';
import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
import type { CanisterIdText } from '$lib/types/canister';
import type { NetworkId } from '$lib/types/network';
import type { TokenStandard } from '$lib/types/token';
import { invalidIcpAddress, isEthAddress } from '$lib/utils/account.utils';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';
import { BtcNetwork, parseBtcAddress, type BtcAddress } from '@dfinity/ckbtc';
import { isNullish, nonNullish } from '@dfinity/utils';

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

export const isNetworkIdBTCMainnet = (networkId: NetworkId | undefined): boolean =>
	BTC_MAINNET_NETWORK_ID === networkId;

export const isNetworkIdBTCTestnet = (networkId: NetworkId | undefined): boolean =>
	BTC_TESTNET_NETWORK_ID === networkId;

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

	if (isNetworkIdBitcoin(networkId)) {
		return invalidBtcAddress({
			address: destination,
			network: isNetworkIdBTCMainnet(networkId) ? BtcNetwork.Mainnet : BtcNetwork.Testnet
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
