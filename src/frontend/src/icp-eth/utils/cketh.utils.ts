import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import type { OptionAddress } from '$lib/types/address';
import { fromNullable } from '@dfinity/utils';

export const toCkEthHelperContractAddress = (
	minterInfo: OptionCertifiedMinterInfo
): OptionAddress => fromNullable(minterInfo?.data.eth_helper_contract_address ?? []);

export const toCkErc20HelperContractAddress = (
	minterInfo: OptionCertifiedMinterInfo
): OptionAddress => fromNullable(minterInfo?.data.erc20_helper_contract_address ?? []);
