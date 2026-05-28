import { invalidBtcAddress } from '$btc/utils/btc-address.utils';
import { isEthAddress } from '$eth/utils/account.utils';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import {
	isNetworkIdBitcoin,
	isNetworkIdBTCRegtest,
	isNetworkIdBTCTestnet,
	isNetworkIdEthereum,
	isNetworkIdEvm,
	isNetworkIdICP,
	isNetworkIdSolana
} from '$lib/utils/network.utils';
import { invalidSolAddress } from '$sol/utils/sol-address.utils';
import { notEmptyString } from '@dfinity/utils';
import { BtcNetwork } from '@icp-sdk/canisters/ckbtc';
import { Principal } from '@icp-sdk/core/principal';

export const isInvalidDestinationBtc = ({
	destination,
	networkId
}: {
	destination: string;
	networkId: NetworkId | undefined;
}): boolean => {
	if (isNullishOrEmpty(destination)) {
		return false;
	}

	return invalidBtcAddress({
		address: destination,
		network: isNetworkIdBTCTestnet(networkId)
			? BtcNetwork.Testnet
			: isNetworkIdBTCRegtest(networkId)
				? BtcNetwork.Regtest
				: BtcNetwork.Mainnet
	});
};

const isValidPrincipalText = (value: string): boolean => {
	try {
		Principal.fromText(value);
		return true;
	} catch (_: unknown) {
		return false;
	}
};

export const shouldSkipDestinationStep = ({
	destination,
	token
}: {
	destination: string;
	token: Token;
}): boolean => {
	if (!notEmptyString(destination)) {
		return false;
	}

	const { network } = token;

	if (isNetworkIdSolana(network.id)) {
		return !invalidSolAddress(destination);
	}

	if (isNetworkIdBitcoin(network.id)) {
		return !isInvalidDestinationBtc({ destination, networkId: network.id });
	}

	if (isNetworkIdICP(network.id)) {
		return isValidPrincipalText(destination);
	}

	if (isNetworkIdEthereum(network.id) || isNetworkIdEvm(network.id)) {
		return isEthAddress(destination);
	}

	return false;
};
