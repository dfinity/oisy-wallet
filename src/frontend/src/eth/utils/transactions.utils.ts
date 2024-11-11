import { ERC20_APPROVE_HASH } from '$eth/constants/erc20.constants';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { OptionEthAddress } from '$lib/types/address';
import type { Transaction } from '$lib/types/transaction';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';

export const isTransactionPending = ({ blockNumber }: Transaction): boolean =>
	isNullish(blockNumber);

export const isErc20TransactionApprove = (data: string | undefined): boolean =>
	nonNullish(data) && data.startsWith(ERC20_APPROVE_HASH);

export const decodeErc20AbiDataValue = (data: string): BigNumber => {
	const [_to, value] = ethers.utils.defaultAbiCoder.decode(
		['address', 'uint256'],
		ethers.utils.hexDataSlice(data, 4)
	);

	return value;
};

/**
 * It maps a transaction to an Ethereum transaction UI object
 */
export const mapEthTransactionUi = ({
	transaction,
	ckMinterInfoAddresses,
	$ethAddress
}: {
	transaction: Transaction;
	ckMinterInfoAddresses: OptionEthAddress[];
	$ethAddress: OptionEthAddress;
}): EthTransactionUi => {
	const { from, to } = transaction;

	return {
		...transaction,
		uiType: ckMinterInfoAddresses.includes(from.toLowerCase())
			? 'withdraw'
			: ckMinterInfoAddresses.includes(to?.toLowerCase())
				? 'deposit'
				: from?.toLowerCase() === $ethAddress?.toLowerCase()
					? 'send'
					: 'receive'
	};
};
