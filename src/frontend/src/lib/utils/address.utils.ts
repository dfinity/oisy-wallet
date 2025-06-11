import { SUPPORTED_EVM_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_BITCOIN_NETWORK_IDS } from '$env/networks/networks.btc.env';
import { SUPPORTED_ETHEREUM_NETWORK_IDS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SUPPORTED_SOLANA_NETWORK_IDS } from '$env/networks/networks.sol.env';
import { TOKEN_ACCOUNT_ID_TYPES_CASE_SENSITIVE } from '$lib/constants/token-account-id.constants';
import type { StorageAddressData } from '$lib/stores/address.store';
import type { Address, OptionAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
import { mapCertifiedData } from '$lib/utils/certified-store.utils';
import { parseBtcAddress, type BtcAddress } from '@dfinity/ckbtc';
import { isNullish, nonNullish } from '@dfinity/utils';

export const mapAddress = <T extends Address>(
	$addressStore: StorageAddressData<T>
): OptionAddress<T> => mapCertifiedData($addressStore);

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

const mapNetworkIdToAddressType = (
	networkId: NetworkId | undefined
): TokenAccountIdTypes | undefined => {
	if (isNullish(networkId)) {
		return;
	}

	if (networkId === ICP_NETWORK_ID) {
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
