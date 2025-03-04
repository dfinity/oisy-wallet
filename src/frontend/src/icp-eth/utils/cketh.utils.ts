import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import type { OptionEthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { fromNullishNullable, nonNullish } from '@dfinity/utils';

export const toCkEthHelperContractAddress = ({
	minterInfo
}: {
	minterInfo: OptionCertifiedMinterInfo;
	networkId: NetworkId;
}): OptionEthAddress => fromNullishNullable(minterInfo?.data.eth_helper_contract_address);

export const toCkErc20HelperContractAddress = (
	minterInfo: OptionCertifiedMinterInfo
): OptionEthAddress => fromNullishNullable(minterInfo?.data.erc20_helper_contract_address);

const toCkMinterAddress = (minterInfo: OptionCertifiedMinterInfo): OptionEthAddress =>
	fromNullishNullable(minterInfo?.data.minter_address);

export const toCkMinterInfoAddresses = ({
	minterInfo,
	networkId
}: {
	minterInfo: OptionCertifiedMinterInfo;
	networkId: NetworkId;
}): OptionEthAddress[] =>
	nonNullish(minterInfo)
		? [
				toCkEthHelperContractAddress({ minterInfo, networkId }),
				toCkErc20HelperContractAddress(minterInfo),
				toCkMinterAddress(minterInfo)
			].map((address) => address?.toLowerCase())
		: [];
