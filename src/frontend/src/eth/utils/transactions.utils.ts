import { ERC20_APPROVE_HASH } from '$eth/constants/erc20.constants';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { OptionEthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { OptionString } from '$lib/types/string';
import type { Transaction } from '$lib/types/transaction';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';

export const isTransactionPending = ({ blockNumber }: EthTransactionUi): boolean =>
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
 * It will try to map an address to a name among the known addresses (e.g. ERC20 tokens, CK minters).
 *
 * The string will be used to be displayed instead of the address and make it more user-friendly, avoiding confusions.
 */
// TODO: check if can try and fetch metadata for the putative token if it is not in the list
export const mapAddressToName = ({
	address,
	networkId,
	erc20Tokens
}: {
	address: OptionEthAddress;
	networkId: NetworkId;
	erc20Tokens: Erc20Token[];
}): OptionString =>
	erc20Tokens.find(
		({ address: tokenAddress, network: { id: tokenNetworkId } }) =>
			tokenAddress === address && tokenNetworkId === networkId
	)?.name;

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
		id: transaction.hash ?? '',
		type: ckMinterInfoAddresses.includes(from.toLowerCase())
			? 'withdraw'
			: ckMinterInfoAddresses.includes(to?.toLowerCase())
				? 'deposit'
				: from?.toLowerCase() === $ethAddress?.toLowerCase()
					? 'send'
					: 'receive'
	};
};
