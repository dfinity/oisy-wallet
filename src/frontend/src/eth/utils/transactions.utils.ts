import { ERC_SET_APPROVAL_FOR_ALL_HASH } from '$eth/constants/erc.constants';
import {
	ERC20_APPROVE_HASH,
	ERC20_DECREASE_ALLOWANCE_HASH,
	ERC20_DEPOSIT_ERC20_HASH,
	ERC20_DEPOSIT_HASH,
	ERC20_INCREASE_ALLOWANCE_HASH,
	ERC20_TRANSFER_HASH
} from '$eth/constants/erc20.constants';
import {
	MULTICALL_ARGUMENTS,
	MULTICALL_MAX_DEPTH,
	MULTICALL_MAX_METHODS
} from '$eth/constants/multicall.constants';
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

// `0x` and the four bytes of a function selector, as hex.
const SELECTOR_LENGTH = 10;

/**
 * Whether calldata begins with a given function selector.
 *
 * Casing is not part of calldata: `0xA9059CBB` and `0xa9059cbb` are the same four bytes and the
 * same call to the same contract. Comparing them as text therefore let a dApp miss every ERC-20
 * check by changing nothing the EVM can see — the review described a native zero-value send, the
 * fail-closed warning never fired because the calldata was never recognised as ERC-20 at all, and
 * the transfer was signed and broadcast regardless.
 *
 * The comparison is on the selector alone. The calldata is passed on untouched, because what gets
 * signed must be what was received.
 */
const hasSelector = ({ data, selector }: { data: string; selector: string }): boolean =>
	data.slice(0, SELECTOR_LENGTH).toLowerCase() === selector.toLowerCase();

export const isErc20TransactionApprove = (data: string | undefined): boolean =>
	nonNullish(data) && hasSelector({ data, selector: ERC20_APPROVE_HASH });

export const isErc20TransactionTransfer = (data: string | undefined): boolean =>
	nonNullish(data) && hasSelector({ data, selector: ERC20_TRANSFER_HASH });

export const isErcTransactionSetApprovalForAll = (data: string | undefined): boolean =>
	nonNullish(data) && hasSelector({ data, selector: ERC_SET_APPROVAL_FOR_ALL_HASH });

export const isErc20TransactionIncreaseAllowance = (data: string | undefined): boolean =>
	nonNullish(data) && hasSelector({ data, selector: ERC20_INCREASE_ALLOWANCE_HASH });

export const isErc20TransactionDecreaseAllowance = (data: string | undefined): boolean =>
	nonNullish(data) && hasSelector({ data, selector: ERC20_DECREASE_ALLOWANCE_HASH });

export const isErc20TransactionDeposit = (data: string | undefined): boolean =>
	nonNullish(data) &&
	(hasSelector({ data, selector: ERC20_DEPOSIT_HASH }) ||
		hasSelector({ data, selector: ERC20_DEPOSIT_ERC20_HASH }));

/**
 * Whether a transaction carries a call at all, rather than only moving native value.
 *
 * Anything past the `0x` is a call: it is read by the contract at the destination, and what it does
 * there is not constrained by the value field. Calldata too short to hold a selector is a call too,
 * one that names no function, and lumping it in with a plain transfer would let four bytes of
 * nothing be reviewed as an ordinary send.
 */
export const hasCalldata = (data: string | undefined): boolean =>
	nonNullish(data) && data.replace(/^0x/i, '').length > 0;

/**
 * The four-byte function selector calldata begins with, lowercased.
 *
 * `undefined` when there is no function to name, which is either no calldata at all or too few
 * bytes to carry a selector.
 */
export const getCalldataSelector = (data: string | undefined): string | undefined =>
	nonNullish(data) && data.length >= SELECTOR_LENGTH
		? data.slice(0, SELECTOR_LENGTH).toLowerCase()
		: undefined;

const abiCoder = AbiCoder.defaultAbiCoder();

/**
 * Every function a transaction's calldata calls, the one it is addressed to and the ones batched
 * inside it.
 *
 * A dApp that batches an approve and a swap sends a single transaction whose own selector names
 * neither, so the selector alone answers "what does this call?" with the name of the wrapper. The
 * nested calls are complete calldata sitting in a `bytes[]`, so they are read out and listed too.
 *
 * Best effort by construction, and the list says which entries were read rather than implying the
 * whole tree: a wrapper this does not know how to open contributes itself and nothing more. Naming
 * a function is not reviewing it either. The arguments behind each selector are not decoded here,
 * so an entry states what is being called and never what it would do.
 */
export const getCalldataMethods = (
	data: string | undefined
): { methods: { selector: string | undefined; depth: number }[]; capped: boolean } => {
	if (!hasCalldata(data)) {
		return { methods: [], capped: false };
	}

	const methods: { selector: string | undefined; depth: number }[] = [];

	// Set only where a call was actually left out, so a batch that ends exactly on the cap is
	// reported as complete. Saying calls were omitted when none were is its own misstatement.
	let capped = false;

	const walk = ({ calldata, depth }: { calldata: string; depth: number }) => {
		if (methods.length >= MULTICALL_MAX_METHODS) {
			capped = true;
			return;
		}

		const selector = getCalldataSelector(calldata);

		methods.push({ selector, depth });

		if (isNullish(selector) || depth >= MULTICALL_MAX_DEPTH) {
			return;
		}

		const args = MULTICALL_ARGUMENTS[selector];

		if (isNullish(args)) {
			return;
		}

		try {
			const decoded = abiCoder.decode(args, dataSlice(calldata, 4));
			const nested = decoded[args.indexOf('bytes[]')] as string[];

			// Stops at the cap rather than walking the remainder to discard it: the array is the
			// dApp's to size, and a batch of any length must not buy work per element here.
			for (const call of nested) {
				if (methods.length >= MULTICALL_MAX_METHODS) {
					capped = true;
					break;
				}

				walk({ calldata: call, depth: depth + 1 });
			}
		} catch (_: unknown) {
			// A wrapper whose arguments do not decode carries nothing this can read. It stays in the
			// list as itself rather than being described by calls that were never recovered.
		}
	};

	walk({ calldata: data as string, depth: 0 });

	return { methods, capped };
};

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
 * Decodes an ERC-721/ERC-1155 `setApprovalForAll` call.
 *
 * The grant has no amount: it hands the operator every token the caller holds in the collection, so
 * the operator and whether the call grants or revokes are the whole of what is being authorized.
 */
export const decodeSetApprovalForAllData = (
	data: string
): { operator: EthAddress; approved: boolean } => {
	const [operator, approved] = abiCoder.decode(['address', 'bool'], dataSlice(data, 4));

	return { operator, approved };
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

		const networkGroup = groups.get(itemNetworkId);

		if (isNullish(networkGroup)) {
			groups.set(itemNetworkId, new Map<string, T[]>([[itemHash, [item]]]));

			return;
		}

		const groupItems = networkGroup.get(itemHash);

		if (nonNullish(groupItems)) {
			groupItems.push(item);
		} else {
			networkGroup.set(itemHash, [item]);
		}
	});

	return groups;
};

/**
 * Finds every ERC transfer that a transaction hash produced.
 *
 * More than one means the transaction moved several assets - a swap, a batch send, a token that
 * splits a transfer - so no single transfer describes it.
 */
export const findErcTransfers = ({
	hash,
	networkId,
	transfers
}: {
	hash: string | undefined;
	networkId: NetworkId;
	transfers: Map<NetworkId, Map<string, ErcTransfer[]>>;
}): ErcTransfer[] => (isNullish(hash) ? [] : (transfers.get(networkId)?.get(hash) ?? []));

/**
 * Finds the ERC transfer that a transaction hash belongs to.
 *
 * A swap or a batch send emits several transfers under the same hash. None of them describes the
 * transaction on its own, so an ambiguous hash resolves to nothing rather than to an arbitrary leg.
 */
export const findErcTransfer = (params: {
	hash: string | undefined;
	networkId: NetworkId;
	transfers: Map<NetworkId, Map<string, ErcTransfer[]>>;
}): ErcTransfer | undefined => {
	const matches = findErcTransfers(params);

	return matches.length === 1 ? matches[0] : undefined;
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
