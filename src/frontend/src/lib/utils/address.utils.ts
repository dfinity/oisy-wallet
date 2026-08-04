import { SUPPORTED_EVM_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.env';
import {
	BTC_MAINNET_NETWORK_ID,
	SUPPORTED_BITCOIN_NETWORK_IDS
} from '$env/networks/networks.btc.env';
import {
	ETHEREUM_NETWORK_ID,
	SUPPORTED_ETHEREUM_NETWORK_IDS
} from '$env/networks/networks.eth.env';
import {
	SOLANA_MAINNET_NETWORK_ID,
	SUPPORTED_SOLANA_NETWORK_IDS
} from '$env/networks/networks.sol.env';
import { TOKEN_ACCOUNT_ID_TYPES_CASE_SENSITIVE } from '$lib/constants/token-account-id.constants';
import type { AddressStoreData } from '$lib/stores/address.store';
import type { Address, OptionAddress } from '$lib/types/address';
import type { Network, NetworkId } from '$lib/types/network';
import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
import { mapCertifiedData } from '$lib/utils/certified-store.utils';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdEthereum,
	isNetworkIdEvm,
	isNetworkIdICP,
	isNetworkIdSOLMainnet
} from '$lib/utils/network.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const mapAddress = <T extends Address>(
	$addressStore: AddressStoreData<T>
): OptionAddress<T> => mapCertifiedData($addressStore);

export const mapNetworkIdToAddressType = (
	networkId: NetworkId | undefined
): TokenAccountIdTypes | undefined => {
	if (isNullish(networkId)) {
		return;
	}

	if (isNetworkIdICP(networkId)) {
		return 'Icrcv2';
	}
	if (SUPPORTED_BITCOIN_NETWORK_IDS.includes(networkId)) {
		return 'Btc';
	}
	if (
		SUPPORTED_ETHEREUM_NETWORK_IDS.includes(networkId) ||
		SUPPORTED_EVM_NETWORK_IDS.includes(networkId)
	) {
		return 'Eth';
	}
	if (SUPPORTED_SOLANA_NETWORK_IDS.includes(networkId)) {
		return 'Sol';
	}
};

export const getCaseSensitiveness = (
	params: { addressType: TokenAccountIdTypes } | { networkId: NetworkId | undefined }
): boolean => {
	const addressType =
		'addressType' in params ? params.addressType : mapNetworkIdToAddressType(params.networkId);

	return nonNullish(addressType) ? TOKEN_ACCOUNT_ID_TYPES_CASE_SENSITIVE[addressType] : false;
};

export const areAddressesEqual = <T extends Address>({
	address1,
	address2,
	...rest
}: { address1: OptionAddress<T>; address2: OptionAddress<T> } & (
	{ networkId: NetworkId } | { addressType: TokenAccountIdTypes }
)): boolean => {
	if (isNullish(address1) || isNullish(address2)) {
		return false;
	}

	const isCaseSensitive = getCaseSensitiveness(rest);

	if (isCaseSensitive) {
		return address1 === address2;
	}

	return address1.toLowerCase() === address2.toLowerCase();
};

export const areAddressesPartiallyEqual = <T extends Address>({
	address1,
	address2,
	networkId
}: {
	address1: OptionAddress<T>;
	address2: OptionAddress<T>;
	networkId: NetworkId;
}): boolean => {
	if (isNullish(address1) || isNullish(address2)) {
		return false;
	}

	const isCaseSensitive = getCaseSensitiveness({ networkId });

	if (isCaseSensitive) {
		return address1.includes(address2) || address2.includes(address1);
	}

	return (
		address1.toLowerCase().includes(address2.toLowerCase()) ||
		address2.toLowerCase().includes(address1.toLowerCase())
	);
};

// One derived address can serve several networks, so a failure is not confined to the network it
// was loaded under. The Ethereum address is shared by every EVM network — Base, Polygon, BNB,
// Arbitrum and the EVM testnets — so naming only "Ethereum" would leave a user with Base assets
// wondering why those broke too. Bitcoin and Solana mainnet each have their own address, and their
// testnet counterparts are loaded separately, so a mainnet failure must not implicate them.
const dependsOnFailedAddress = ({
	networkId,
	failedNetworkId
}: {
	networkId: NetworkId;
	failedNetworkId: NetworkId;
}): boolean =>
	failedNetworkId === ETHEREUM_NETWORK_ID
		? isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)
		: failedNetworkId === BTC_MAINNET_NETWORK_ID
			? isNetworkIdBTCMainnet(networkId)
			: failedNetworkId === SOLANA_MAINNET_NETWORK_ID
				? isNetworkIdSOLMainnet(networkId)
				: false;

/**
 * Expand failed addresses to every enabled network that cannot work without them.
 *
 * `networks` is passed in rather than read here so the result keeps the network selector's order —
 * the order the user already recognises, not the order the addresses happened to fail in. ICP never
 * appears: its address comes from the principal directly rather than from derivation, which is why
 * the wallet always keeps at least one working network.
 */
export const networksDependingOnFailedAddresses = ({
	networks,
	failedNetworkIds
}: {
	networks: Network[];
	failedNetworkIds: NetworkId[];
}): Network[] =>
	networks.filter(({ id }) =>
		failedNetworkIds.some((failedNetworkId) =>
			dependsOnFailedAddress({ networkId: id, failedNetworkId })
		)
	);
