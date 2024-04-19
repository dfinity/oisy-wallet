import type { ETH_ADDRESS } from '$lib/types/address';
import type { CertifiedData } from '$lib/types/store';
import type { MinterInfo } from '@dfinity/cketh';
import { fromNullable } from '@dfinity/utils';

export const toCkEthHelperContractAddress = (
	minterInfo: CertifiedData<MinterInfo> | undefined | null
): ETH_ADDRESS | undefined | null =>
	fromNullable(minterInfo?.data.eth_helper_contract_address ?? []);

export const toCkErc20HelperContractAddress = (
	minterInfo: CertifiedData<MinterInfo> | undefined | null
): ETH_ADDRESS | undefined | null =>
	fromNullable(minterInfo?.data.erc20_helper_contract_address ?? []);
