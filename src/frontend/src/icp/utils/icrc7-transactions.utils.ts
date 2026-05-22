import type { Value } from '$declarations/icrc3/icrc3.did';
import type { Icrc3Block } from '$icp/services/icrc3.services';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import type { NullishIdentity } from '$lib/types/identity';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	encodeIcrcAccount,
	fromCandidAccount,
	type IcrcIndexDid
} from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';

type Icrc7BlockType = '7mint' | '7burn' | '7xfer';

interface ParsedIcrc7Block {
	id: bigint;
	type: Icrc7BlockType;
	timestamp?: bigint;
	tokenId: bigint;
	from?: string;
	to?: string;
}

const lookupMapValue = ({
	map,
	key
}: {
	map: Array<[string, Value]>;
	key: string;
}): Value | undefined => map.find(([entryKey]) => entryKey === key)?.[1];

const valueAsMap = ({ value }: { value: Value | undefined }): Array<[string, Value]> | undefined =>
	nonNullish(value) && 'Map' in value ? value.Map : undefined;

const valueAsNat = ({ value }: { value: Value | undefined }): bigint | undefined =>
	nonNullish(value) && 'Nat' in value ? value.Nat : undefined;

const valueAsText = ({ value }: { value: Value | undefined }): string | undefined =>
	nonNullish(value) && 'Text' in value ? value.Text : undefined;

const valueAsBlob = ({ value }: { value: Value | undefined }): Uint8Array | undefined =>
	nonNullish(value) && 'Blob' in value ? value.Blob : undefined;

const valueAsIcrc7BlockType = ({
	value
}: {
	value: Value | undefined;
}): Icrc7BlockType | undefined => {
	const text = valueAsText({ value });

	return text === '7mint' || text === '7burn' || text === '7xfer' ? text : undefined;
};

const valueAsPrincipal = ({ value }: { value: Value | undefined }): Principal | undefined => {
	const text = valueAsText({ value });

	if (nonNullish(text)) {
		try {
			return Principal.fromText(text);
		} catch (_: unknown) {
			return;
		}
	}

	const blob = valueAsBlob({ value });

	return nonNullish(blob) ? Principal.fromUint8Array(blob) : undefined;
};

const valueAsAccount = ({ value }: { value: Value | undefined }): string | undefined => {
	const map = valueAsMap({ value });

	if (isNullish(map)) {
		return valueAsText({ value });
	}

	const owner = valueAsPrincipal({ value: lookupMapValue({ map, key: 'owner' }) });

	if (isNullish(owner)) {
		return;
	}

	const subaccount = valueAsBlob({ value: lookupMapValue({ map, key: 'subaccount' }) });
	const account: IcrcIndexDid.Account = {
		owner,
		subaccount: nonNullish(subaccount) ? [subaccount] : []
	};

	return encodeIcrcAccount(fromCandidAccount(account));
};

const parseIcrc7Block = ({ id, block }: Icrc3Block): ParsedIcrc7Block | undefined => {
	const blockMap = valueAsMap({ value: block });

	if (isNullish(blockMap)) {
		return;
	}

	const type = valueAsIcrc7BlockType({ value: lookupMapValue({ map: blockMap, key: 'btype' }) });
	const txMap = valueAsMap({ value: lookupMapValue({ map: blockMap, key: 'tx' }) });

	if (isNullish(type) || isNullish(txMap)) {
		return;
	}

	const tokenId =
		valueAsNat({ value: lookupMapValue({ map: txMap, key: 'tid' }) }) ??
		valueAsNat({ value: lookupMapValue({ map: txMap, key: 'token_id' }) });

	if (isNullish(tokenId)) {
		return;
	}

	return {
		id,
		type,
		timestamp: valueAsNat({ value: lookupMapValue({ map: blockMap, key: 'ts' }) }),
		tokenId,
		from: valueAsAccount({ value: lookupMapValue({ map: txMap, key: 'from' }) }),
		to: valueAsAccount({ value: lookupMapValue({ map: txMap, key: 'to' }) })
	};
};

const mapIcrc7Transfer = ({
	transaction,
	accountIdentifier
}: {
	transaction: ParsedIcrc7Block;
	accountIdentifier: string;
}): IcTransactionUi[] => {
	const { id, timestamp, tokenId, from, to } = transaction;
	const isSender = from?.toLowerCase() === accountIdentifier.toLowerCase();
	const isReceiver = to?.toLowerCase() === accountIdentifier.toLowerCase();

	return [
		...(isSender
			? [
					{
						id: id.toString(),
						type: 'send' as const,
						from,
						to,
						incoming: false,
						timestamp,
						status: 'executed' as const,
						tokenId
					}
				]
			: []),
		...(isReceiver
			? [
					{
						id: `${id.toString()}${isSender ? '-self' : ''}`,
						type: 'receive' as const,
						from,
						to,
						incoming: true,
						timestamp,
						status: 'executed' as const,
						tokenId
					}
				]
			: [])
	];
};

export const mapIcrc7BlockToTransactions = ({
	block,
	identity
}: {
	block: Icrc3Block;
	identity: NullishIdentity;
}): IcTransactionUi[] => {
	if (isNullish(identity)) {
		return [];
	}

	const transaction = parseIcrc7Block(block);

	if (isNullish(transaction)) {
		return [];
	}

	const accountIdentifier = encodeIcrcAccount(getIcrcAccount(identity.getPrincipal()));
	const { id, type, timestamp, tokenId, from, to } = transaction;

	if (type === '7xfer') {
		return mapIcrc7Transfer({ transaction, accountIdentifier });
	}

	if (type === '7mint' && to?.toLowerCase() === accountIdentifier.toLowerCase()) {
		return [
			{
				id: id.toString(),
				type: 'mint',
				to,
				incoming: true,
				timestamp,
				status: 'executed',
				tokenId
			}
		];
	}

	if (type === '7burn' && from?.toLowerCase() === accountIdentifier.toLowerCase()) {
		return [
			{
				id: id.toString(),
				type: 'burn',
				from,
				incoming: false,
				timestamp,
				status: 'executed',
				tokenId
			}
		];
	}

	return [];
};
