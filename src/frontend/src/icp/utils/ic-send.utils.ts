import { BTC_MAINNET_NETWORK_ID, BTC_TESTNET_NETWORK_ID } from '$env/networks.env';
import { CKBTC_LEDGER_CANISTER_IDS, CKETH_LEDGER_CANISTER_IDS } from '$env/networks.ircrc.env';
import type { IcToken } from '$icp/types/ic';
import { invalidIcpAddress } from '$icp/utils/icp-account.utils';
import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
import type { NetworkId } from '$lib/types/network';
import type { TokenStandard } from '$lib/types/token';
import { isEthAddress } from '$lib/utils/account.utils';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { isNetworkIdEthereum } from '$lib/utils/network.utils';
import { parseBtcAddress, type BtcAddress } from '@dfinity/ckbtc';
import { BtcNetwork } from '@dfinity/ckbtc/dist/types/enums/btc.enums';
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

export const isTokenCkBtcLedger = ({ ledgerCanisterId }: Partial<IcToken>): boolean =>
	nonNullish(ledgerCanisterId) && CKBTC_LEDGER_CANISTER_IDS.includes(ledgerCanisterId);

export const isTokenCkEthLedger = ({ ledgerCanisterId }: Partial<IcToken>): boolean =>
	nonNullish(ledgerCanisterId) && CKETH_LEDGER_CANISTER_IDS.includes(ledgerCanisterId);

export const isNetworkIdBTC = (networkId: NetworkId | undefined): boolean =>
	nonNullish(networkId) && [BTC_MAINNET_NETWORK_ID, BTC_TESTNET_NETWORK_ID].includes(networkId);

export const isNetworkIdBTCMainnet = (networkId: NetworkId | undefined): boolean =>
	BTC_MAINNET_NETWORK_ID === networkId;

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
