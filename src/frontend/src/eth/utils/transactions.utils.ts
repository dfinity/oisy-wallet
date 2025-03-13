import { ERC20_APPROVE_HASH } from '$eth/constants/erc20.constants';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import {
	toCkErc20HelperContractAddress,
	toCkEthHelperContractAddress,
	toCkMinterAddress
} from '$icp-eth/utils/cketh.utils';
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
	erc20Tokens,
	ckMinterInfo
}: {
	address: OptionEthAddress;
	networkId: NetworkId;
	erc20Tokens: Erc20Token[];
	ckMinterInfo: OptionCertifiedMinterInfo;
}): OptionString => {
	if (isNullish(address)) {
		return undefined;
	}

	const putativeErc20TokenName: string | undefined = erc20Tokens.find(
		({ address: tokenAddress, network: { id: tokenNetworkId } }) =>
			tokenAddress === address && tokenNetworkId === networkId
	)?.name;

	const ckEthHelperContractAddress = toCkEthHelperContractAddress(ckMinterInfo);
	const ckErc20HelperContractAddress = toCkErc20HelperContractAddress(ckMinterInfo);
	const ckMinterAddress = toCkMinterAddress(ckMinterInfo);

	// TODO: find a way to get the contracts name more dynamically
	const putativeMinterName: string | undefined =
		nonNullish(ckEthHelperContractAddress) &&
		address.toLowerCase() === ckEthHelperContractAddress.toLowerCase()
			? 'ckETH Minter Helper Contract'
			: nonNullish(ckErc20HelperContractAddress) &&
				  address.toLowerCase() === ckErc20HelperContractAddress.toLowerCase()
				? 'ckERC20 Minter Helper Contract'
				: nonNullish(ckMinterAddress) && address.toLowerCase() === ckMinterAddress.toLowerCase()
					? 'CK Ethereum Minter'
					: undefined;

	return putativeErc20TokenName ?? putativeMinterName;
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
