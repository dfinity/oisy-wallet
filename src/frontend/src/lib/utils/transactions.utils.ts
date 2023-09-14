import { ERC20_APPROVE_HASH } from '$lib/constants/erc20.constants';
import type { Transaction } from '$lib/types/transaction';
import { isNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';

export const isTransactionPending = ({ blockNumber }: Transaction): boolean =>
	isNullish(blockNumber);

export const isErc20TransactionApprove = (data: string): boolean =>
	data.startsWith(ERC20_APPROVE_HASH);

export const decodeErc20AbiDataValue = (data: string): BigNumber => {
	const [_to, value] = ethers.utils.defaultAbiCoder.decode(
		['address', 'uint256'],
		ethers.utils.hexDataSlice(data, 4)
	);

	return value;
};
