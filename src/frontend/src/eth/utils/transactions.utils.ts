import { ERC20_APPROVE_HASH } from '$eth/constants/erc20.constants';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import {
	toCkErc20HelperContractAddress,
	toCkEthHelperContractAddress,
	toCkMinterAddress
} from '$icp-eth/utils/cketh.utils';
import type { EthAddress, OptionEthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { OptionString } from '$lib/types/string';
import type { Transaction } from '$lib/types/transaction';
import { isNullish, nonNullish } from '@dfinity/utils';
import { AbiCoder } from 'ethers/abi';
import { dataSlice } from 'ethers/utils';

export const isTransactionPending = ({ blockNumber }: EthTransactionUi): boolean =>
	isNullish(blockNumber);

export const isErc20TransactionApprove = (data: string | undefined): boolean =>
	nonNullish(data) && data.startsWith(ERC20_APPROVE_HASH);

export const decodeErc20AbiDataValue = ({
	data,
	bytesParam = false
}: {
	data: string;
	bytesParam?: boolean;
}): bigint => {
	const [_to, value] = AbiCoder.defaultAbiCoder().decode(
		['address', 'uint256', ...(bytesParam ? ['bytes32'] : [])],
		dataSlice(data, 4)
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
	const ckMinterNameMap: Record<EthAddress, string> = {
		...(nonNullish(ckEthHelperContractAddress) && {
			[ckEthHelperContractAddress.toLowerCase()]: 'ckETH Minter Helper Contract'
		}),
		...(nonNullish(ckErc20HelperContractAddress) && {
			[ckErc20HelperContractAddress.toLowerCase()]: 'ckERC20 Minter Helper Contract'
		}),
		...(nonNullish(ckMinterAddress) && { [ckMinterAddress.toLowerCase()]: 'CK Ethereum Minter' })
	};

	const putativeCkMinterName: string | undefined = ckMinterNameMap[address.toLowerCase()];

	return putativeErc20TokenName ?? putativeCkMinterName;
};

/**
 * It maps a transaction to an Ethereum transaction UI object
 */
export const mapEthTransactionUi = ({
	transaction,
	ckMinterInfoAddresses,
	ethAddress
}: {
	transaction: Transaction;
	ckMinterInfoAddresses: EthAddress[];
	ethAddress: OptionEthAddress;
}): EthTransactionUi => {
	const { from, to } = transaction;

	return {
		...transaction,
		id: transaction.hash ?? '',
		type: ckMinterInfoAddresses.includes(from.toLowerCase())
			? 'withdraw'
			: nonNullish(to) && ckMinterInfoAddresses.includes(to.toLowerCase())
				? 'deposit'
				: from?.toLowerCase() === ethAddress?.toLowerCase()
					? 'send'
					: 'receive'
	};
};
