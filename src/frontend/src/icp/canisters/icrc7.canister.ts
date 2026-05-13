import type {
	Account,
	_SERVICE as Icrc7Service,
	TransferArg,
	TransferResult,
	Value
} from '$declarations/icrc7/icrc7.did';
import { idlFactory as idlCertifiedFactoryIcrc7 } from '$declarations/icrc7/icrc7.factory.certified.did';
import { idlFactory as idlFactoryIcrc7 } from '$declarations/icrc7/icrc7.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
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

const findValue = (entries: Array<[string, Value]>, key: string): Value | undefined =>
	entries.find(([k]) => k === key)?.[1];

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

		const nameValue = findValue(entries, 'icrc7:name') ?? findValue(entries, 'name');
		const descriptionValue =
			findValue(entries, 'icrc7:description') ?? findValue(entries, 'description');
		const imageValue =
			findValue(entries, 'icrc7:image') ??
			findValue(entries, 'image') ??
			findValue(entries, 'icrc7:logo');

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
		const { icrc7_symbol, icrc7_name, icrc7_description, icrc7_logo } = this.caller({
			certified
		});

		const [symbol, name, description, logo] = await Promise.all([
			icrc7_symbol(),
			icrc7_name(),
			icrc7_description(),
			icrc7_logo()
		]);

		const descriptionValue = fromNullable(description);
		const logoValue = fromNullable(logo);

		return {
			symbol,
			name,
			...(notEmptyString(descriptionValue) && { description: descriptionValue }),
			...(notEmptyString(logoValue) && { icon: logoValue })
		};
	};
}
