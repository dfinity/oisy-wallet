import { ERC20_APPROVE_HASH } from '$eth/constants/erc20.constants';
import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import { MAX_UINT_256 } from '$lib/constants/app.constants';
import type { ContactUi } from '$lib/types/contact';
import type { NetworkId } from '$lib/types/network';
import type { OptionString } from '$lib/types/string';
import type { Transaction } from '$lib/types/transaction';
import type { Option } from '$lib/types/utils';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { getContactForAddress } from '$lib/utils/contact.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { AbiCoder } from 'ethers/abi';
import { dataSlice } from 'ethers/utils';

export const isTransactionPending = ({ blockNumber }: EthTransactionUi): boolean =>
	isNullish(blockNumber);

export const isErc20TransactionApprove = (data: string | undefined): boolean =>
	nonNullish(data) && data.startsWith(ERC20_APPROVE_HASH);

const abiCoder = AbiCoder.defaultAbiCoder();

export const decodeErc20AbiData = ({
	data,
	bytesParam = false
}: {
	data: string;
	bytesParam?: boolean;
}): { to: string; value: bigint } => {
	const [to, value] = abiCoder.decode(
		['address', 'uint256', ...(bytesParam ? ['bytes32'] : [])],
		dataSlice(data, 4)
	);

	return { to, value };
};

export const decodeErc20AbiDataValue = ({
	data,
	bytesParam = false
}: {
	data: string;
	bytesParam?: boolean;
}): bigint => {
	const { value } = decodeErc20AbiData({ data, bytesParam });

	return value;
};

/**
 * It will try to map an address to a name among the known addresses (e.g. ERC20 tokens, built-in contacts).
 *
 * The string will be used to be displayed instead of the address and make it more user-friendly, avoiding confusions.
 */
export const mapAddressToName = ({
	address,
	networkId,
	erc20Tokens,
	builtInContacts = []
}: {
	address: OptionEthAddress;
	networkId: NetworkId;
	erc20Tokens: Erc20Token[];
	builtInContacts?: ContactUi[];
}): OptionString => {
	if (isNullish(address)) {
		return;
	}

	const putativeErc20TokenName: string | undefined = erc20Tokens.find(
		({ address: tokenAddress, network: { id: tokenNetworkId } }) =>
			areAddressesEqual({ address1: tokenAddress, address2: address, networkId }) &&
			tokenNetworkId === networkId
	)?.name;

	const builtInContact = getContactForAddress({
		addressString: address,
		contactList: builtInContacts
	});

	return putativeErc20TokenName ?? builtInContact?.name;
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
	const { from, to, data } = transaction;

	const isApprove = isErc20TransactionApprove(data);

	const { to: approveSpender } =
		isApprove && nonNullish(data) ? decodeErc20AbiData({ data }) : { to: undefined };

	return {
		...transaction,
		id: transaction.hash ?? '',
		type: isApprove
			? 'approve'
			: ckMinterInfoAddresses.includes(from.toLowerCase())
				? 'withdraw'
				: nonNullish(to) && ckMinterInfoAddresses.includes(to.toLowerCase())
					? 'deposit'
					: from?.toLowerCase() === ethAddress?.toLowerCase()
						? 'send'
						: 'receive',
		approveSpender
	};
};

export const isMaxUint256 = (value: Option<bigint>): boolean =>
	nonNullish(value) && value === MAX_UINT_256;
