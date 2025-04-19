import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import type { EthAddress, OptionEthAddress } from '$lib/types/address';
import { fromNullishNullable, nonNullish } from '@dfinity/utils';

export const toCkEthHelperContractAddress = (
	minterInfo: OptionCertifiedMinterInfo
): OptionEthAddress => fromNullishNullable(minterInfo?.data.eth_helper_contract_address);

export const toCkErc20HelperContractAddress = (
	minterInfo: OptionCertifiedMinterInfo
): OptionEthAddress => fromNullishNullable(minterInfo?.data.erc20_helper_contract_address);

export const toCkMinterAddress = (minterInfo: OptionCertifiedMinterInfo): OptionEthAddress =>
	fromNullishNullable(minterInfo?.data.minter_address);

export const toCkMinterInfoAddresses = (minterInfo: OptionCertifiedMinterInfo): EthAddress[] =>
	nonNullish(minterInfo)
		? [
				toCkEthHelperContractAddress(minterInfo),
				toCkErc20HelperContractAddress(minterInfo),
				toCkMinterAddress(minterInfo)
			]
				.map((address) => address?.toLowerCase())
				.filter(nonNullish)
		: [];
