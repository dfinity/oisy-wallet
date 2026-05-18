import type { Account, _SERVICE as Icrc7Service, Value } from '$declarations/icrc7/icrc7.did';
import { idlFactory as idlCertifiedFactoryIcrc7 } from '$declarations/icrc7/icrc7.factory.certified.did';
import { idlFactory as idlFactoryIcrc7 } from '$declarations/icrc7/icrc7.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, toNullable, type QueryParams } from '@dfinity/utils';

// Wrapper around an ICRC-7 NFT collection canister.
// Reference: https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-7/ICRC-7.md
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

	collectionMetadata = async ({ certified }: QueryParams): Promise<Array<[string, Value]>> => {
		const { icrc7_collection_metadata } = this.caller({ certified });

		return await icrc7_collection_metadata();
	};

	getTokensByOwner = async ({
		owner,
		prev,
		take,
		certified
	}: {
		owner: Account;
		prev?: bigint;
		take?: bigint;
	} & QueryParams): Promise<bigint[]> => {
		const { icrc7_tokens_of } = this.caller({ certified });

		return await icrc7_tokens_of(owner, toNullable(prev), toNullable(take));
	};

	getOwnersOf = async ({
		tokenIds,
		certified
	}: { tokenIds: bigint[] } & QueryParams): Promise<Array<[] | [Account]>> => {
		const { icrc7_owner_of } = this.caller({ certified });

		return await icrc7_owner_of(tokenIds);
	};

	tokenMetadata = async ({
		tokenIds,
		certified
	}: { tokenIds: bigint[] } & QueryParams): Promise<Array<[] | [Array<[string, Value]>]>> => {
		const { icrc7_token_metadata } = this.caller({ certified });

		return await icrc7_token_metadata(tokenIds);
	};
}
