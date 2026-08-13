import {
	ERC20_APPROVE_HASH,
	ERC20_DEPOSIT_ERC20_HASH,
	ERC20_DEPOSIT_HASH,
	ERC20_TRANSFER_HASH
} from '$eth/constants/erc20.constants';
import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { ErcTransfer, EthTransactionUi } from '$eth/types/eth-transaction';
import { MAX_UINT_256 } from '$lib/constants/app.constants';
import type { ContactUi } from '$lib/types/contact';
import type { NetworkId } from '$lib/types/network';
import type { OptionString } from '$lib/types/string';
import type { Token } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { getContactForAddress } from '$lib/utils/contact.utils';
import { formatToken } from '$lib/utils/format.utils';
import { isTokenNonFungible } from '$lib/utils/nft.utils';
import { getTokenDisplayName, getTokenDisplaySymbol } from '$lib/utils/token.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import { AbiCoder } from 'ethers/abi';
import { dataSlice } from 'ethers/utils';

export const isTransactionPending = ({ blockNumber }: EthTransactionUi): boolean =>
	isNullish(blockNumber);

export const isErc20TransactionApprove = (data: string | undefined): boolean =>
	nonNullish(data) && data.startsWith(ERC20_APPROVE_HASH);

export const isErc20TransactionTransfer = (data: string | undefined): boolean =>
	nonNullish(data) && data.startsWith(ERC20_TRANSFER_HASH);

export const isErc20TransactionDeposit = (data: string | undefined): boolean =>
	nonNullish(data) &&
	(data.startsWith(ERC20_DEPOSIT_HASH) || data.startsWith(ERC20_DEPOSIT_ERC20_HASH));

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
 * Decodes ERC20 calldata for display, treating calldata that does not decode as unknown.
 *
 * A known selector says nothing about the arguments that follow it: anyone can send a transaction to
 * a wallet carrying the approve selector and a few bytes of garbage, and `decodeErc20AbiData` throws
 * on it. Where the result only feeds a rendered row, that throw would take the transaction list down
 * with it, so an entry that cannot be decoded degrades instead.
 *
 * Not for the send path, where the calldata is the wallet's own and a failure to decode it is a bug
 * worth surfacing.
 */
export const tryDecodeErc20AbiData = ({
	data,
	bytesParam = false
}: {
	data: string;
	bytesParam?: boolean;
}): { to: string | undefined; value: bigint | undefined } => {
	try {
		return decodeErc20AbiData({ data, bytesParam });
	} catch (_: unknown) {
		return { to: undefined, value: undefined };
	}
};

/**
 * Decodes the recipient of an ERC20 `transfer` call.
 *
 * The recipient of a token transfer exists only in the calldata, since the transaction itself is
 * addressed to the token contract.
 */
export const decodeErc20TransferRecipient = (data: string | undefined): EthAddress | undefined =>
	isErc20TransactionTransfer(data) && nonNullish(data)
		? tryDecodeErc20AbiData({ data }).to
		: undefined;

/**
 * Groups EVM transactions by network and transaction hash.
 *
 * One transaction can produce several entries in the wallet - a token transfer plus the native entry
 * for the fee it paid - and the hash is the only thing that relates them. Entries without a hash
 * cannot be related to anything, so they are left out.
 */
export const groupEthTransactionsByNetworkAndHash = <T>({
	items,
	networkId,
	hash
}: {
	items: T[];
	networkId: (item: T) => NetworkId;
	hash: (item: T) => string | undefined;
}): Map<NetworkId, Map<string, T[]>> => {
	const groups = new Map<NetworkId, Map<string, T[]>>();

	items.forEach((item) => {
		const itemHash = hash(item);

		if (isNullish(itemHash)) {
			return;
		}

		const itemNetworkId = networkId(item);

		const networkGroup = groups.get(itemNetworkId) ?? new Map<string, T[]>();

		networkGroup.set(itemHash, [...(networkGroup.get(itemHash) ?? []), item]);

		groups.set(itemNetworkId, networkGroup);
	});

	return groups;
};

/**
 * Finds the ERC transfer that a transaction hash belongs to.
 *
 * A swap or a batch send emits several transfers under the same hash. None of them describes the
 * transaction on its own, so an ambiguous hash resolves to nothing rather than to an arbitrary leg.
 */
export const findErcTransfer = ({
	hash,
	networkId,
	transfers
}: {
	hash: string | undefined;
	networkId: NetworkId;
	transfers: Map<NetworkId, Map<string, ErcTransfer[]>>;
}): ErcTransfer | undefined => {
	if (isNullish(hash)) {
		return;
	}

	const matches = transfers.get(networkId)?.get(hash);

	return matches?.length === 1 ? matches[0] : undefined;
};

/**
 * Describes what an ERC transfer moved, to be displayed with the transaction.
 *
 * A non-fungible transfer has no amount worth formatting: `value` carries the ERC1155 quantity, or
 * simply 1 for an ERC721, and formatting either with the collection decimals renders a meaningless
 * fraction. The collection and the token id identify it instead.
 */
export const formatErcTransferAsset = ({
	token,
	value,
	tokenId
}: {
	token: Token;
	value?: bigint;
	tokenId?: number;
}): string | undefined => {
	if (isTokenNonFungible(token)) {
		const name = getTokenDisplayName(token);

		return nonNullish(tokenId) ? `${name} #${tokenId}` : name;
	}

	if (isNullish(value)) {
		return;
	}

	return `${formatToken({
		value,
		displayDecimals: token.decimals,
		unitName: token.decimals
	})} ${getTokenDisplaySymbol(token)}`;
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
		isApprove && nonNullish(data) ? tryDecodeErc20AbiData({ data }) : { to: undefined };

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
		approveSpender,
		transferRecipient: decodeErc20TransferRecipient(data)
	};
};

export const isMaxUint256 = (value: Nullish<bigint>): boolean =>
	nonNullish(value) && value === MAX_UINT_256;
