import type {
	Account,
	_SERVICE as Icrc7Service,
	TransferArg,
	TransferResult,
	Value
} from '$declarations/icrc7/icrc7.did';
import { idlFactory as idlCertifiedFactoryIcrc7 } from '$declarations/icrc7/icrc7.factory.certified.did';
import { idlFactory as idlFactoryIcrc7 } from '$declarations/icrc7/icrc7.factory.did';
import { mapIcrc7TransferError } from '$icp/canisters/icrc7.errors';
import { mapIcrc7TokenMetadata } from '$icp/utils/icrc7.utils';
import { getAgent } from '$lib/actors/agents.ic';
import { CanisterInternalError } from '$lib/canisters/errors';
import type { CreateCanisterOptions } from '$lib/types/canister';
import type { TokenMetadata } from '$lib/types/token';
import {
	Canister,
	createServices,
	fromNullable,
	notEmptyString,
	type QueryParams
} from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';

export interface Icrc7TokenMetadata {
	name?: string;
	description?: string;
	imageUrl?: string;
	attributes: Array<{ name: string; value: string }>;
}

const valueToString = (value: Value): string => {
	if ('Text' in value) {
		return value.Text;
	}
	if ('Nat' in value) {
		return value.Nat.toString();
	}
	if ('Int' in value) {
		return value.Int.toString();
	}
	if ('Blob' in value) {
		return new TextDecoder().decode(value.Blob);
	}
	return '';
};

const findValue = ({
	entries,
	key
}: {
	entries: Array<[string, Value]>;
	key: string;
}): Value | undefined => entries.find(([k]) => k === key)?.[1];

export class Icrc7Canister extends Canister<Icrc7Service> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<Icrc7Service>): Promise<Icrc7Canister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<Icrc7Service>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryIcrc7,
			certifiedIdlFactory: idlCertifiedFactoryIcrc7
		});

		return new Icrc7Canister(canisterId, service, certifiedService);
	}

	getTokensByOwner = async ({
		principal,
		certified
	}: { principal: Principal } & QueryParams): Promise<bigint[]> => {
		const { icrc7_tokens_of } = this.caller({ certified });

		const account: Account = { owner: principal, subaccount: [] };

		return await icrc7_tokens_of(account, [], []);
	};

	transfer = async ({
		certified,
		to,
		tokenIdentifier
	}: { to: Principal; tokenIdentifier: bigint } & QueryParams): Promise<TransferResult> => {
		const { icrc7_transfer } = this.caller({ certified });

		const arg: TransferArg = {
			from_subaccount: [],
			to: { owner: to, subaccount: [] },
			token_id: tokenIdentifier,
			memo: [],
			created_at_time: []
		};

		const [result] = await icrc7_transfer([arg]);

		const inner = fromNullable(result);

		if (inner === undefined) {
			throw new Error('ICRC-7 transfer returned no result');
		}

		return inner;
	};

	metadata = async ({
		certified,
		tokenIdentifier
	}: { tokenIdentifier: bigint } & QueryParams): Promise<Icrc7TokenMetadata> => {
		const { icrc7_token_metadata } = this.caller({ certified });

		const [entry] = await icrc7_token_metadata([tokenIdentifier]);

		const entries = fromNullable(entry) ?? [];

		const nameValue =
			findValue({ entries, key: 'icrc7:name' }) ?? findValue({ entries, key: 'name' });
		const descriptionValue =
			findValue({ entries, key: 'icrc7:description' }) ??
			findValue({ entries, key: 'description' });
		const imageValue =
			findValue({ entries, key: 'icrc7:image' }) ??
			findValue({ entries, key: 'image' }) ??
			findValue({ entries, key: 'icrc7:logo' });

		const attributes = entries
			.filter(
				([key]) =>
					!['icrc7:name', 'icrc7:description', 'icrc7:image', 'icrc7:logo'].includes(key) &&
					!['name', 'description', 'image'].includes(key)
			)
			.map(([key, value]) => ({ name: key, value: valueToString(value) }));

		return {
			...(nameValue !== undefined && { name: valueToString(nameValue) }),
			...(descriptionValue !== undefined && {
				description: valueToString(descriptionValue)
			}),
			...(imageValue !== undefined && { imageUrl: valueToString(imageValue) }),
			attributes
		};
	};

	collectionMetadata = async ({
		certified
	}: QueryParams): Promise<Omit<TokenMetadata, 'decimals'>> => {
		const { icrc7_collection_metadata, icrc7_symbol, icrc7_name, icrc7_description, icrc7_logo } =
			this.caller({ certified });

		// `icrc7_collection_metadata` is the spec-canonical bulk getter and is the only
		// metadata method that every compliant collection is required to expose. Real
		// canisters routinely omit the per-field getters (especially the optional
		// `icrc7_logo` and `icrc7_description`), so we read from the bulk entries first
		// and only fall back to the individual methods when a key is missing.
		let entries: Array<[string, Value]> | undefined;
		try {
			entries = await icrc7_collection_metadata();
		} catch (_err) {
			entries = undefined;
		}

		const findText = (key: string): string | undefined => {
			const value = entries?.find(([k]) => k === key)?.[1];
			return value !== undefined && 'Text' in value ? value.Text : undefined;
		};

		const collectionSymbol = findText('icrc7:symbol') ?? (await icrc7_symbol());
		const collectionName = findText('icrc7:name') ?? (await icrc7_name());

		const collectionDescription =
			findText('icrc7:description') ??
			fromNullable((await icrc7_description().catch(() => [])) as [] | [string]);
		const collectionLogo =
			findText('icrc7:logo') ?? fromNullable((await icrc7_logo().catch(() => [])) as [] | [string]);

		return {
			symbol: collectionSymbol,
			name: collectionName,
			...(notEmptyString(collectionDescription) && { description: collectionDescription }),
			...(notEmptyString(collectionLogo) && { icon: collectionLogo })
		};
	};

	metadata = async ({
		tokenId,
		certified
	}: { tokenId: bigint } & QueryParams): Promise<NftMetadataWithoutId | undefined> => {
		const [metadata] = await this.tokenMetadata({ tokenIds: [tokenId], certified });
		const entries = fromNullable(metadata);

		if (isNullish(entries)) {
			return;
		}

		return mapIcrc7TokenMetadata(entries);
	};

	/**
	 * Sends a single ICRC-7 token to the specified account.
	 *
	 * @link https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-7/ICRC-7.md#icrc7_transfer
	 *
	 * @returns the transaction index on success.
	 * @throws if the canister returns an empty result, or any of the documented `TransferError` variants.
	 */
	transfer = async ({
		certified,
		to,
		tokenId
	}: { to: Account; tokenId: bigint } & QueryParams): Promise<bigint> => {
		const { icrc7_transfer } = this.caller({ certified });

		const [result] = await icrc7_transfer([
			{
				to,
				token_id: tokenId,
				memo: [],
				from_subaccount: [],
				created_at_time: []
			}
		]);

		if (result === undefined || result.length === 0) {
			throw new CanisterInternalError('ICRC-7 transfer returned no result');
		}

		const [response] = result;

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapIcrc7TransferError(response.Err);
	};
}
