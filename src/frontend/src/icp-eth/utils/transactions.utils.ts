import { ERC20_APPROVE_HASH } from '$eth/constants/erc20.constants';
import { nonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';

export const isErc20TransactionApprove = (data: string | undefined): boolean =>
	nonNullish(data) && data.startsWith(ERC20_APPROVE_HASH);

export const decodeErc20AbiDataValue = (data: string): BigNumber => {
	const [_to, value] = ethers.utils.defaultAbiCoder.decode(
		['address', 'uint256'],
		ethers.utils.hexDataSlice(data, 4)
	);

	return value;
};
