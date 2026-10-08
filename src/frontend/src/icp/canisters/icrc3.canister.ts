import type {
	DataCertificate,
	GetArchivesResult,
	GetBlocksArgs,
	GetBlocksResult,
	_SERVICE as Icrc3Service
} from '$declarations/icrc3/icrc3.did';
import { idlFactory as idlCertifiedFactoryIcrc3 } from '$declarations/icrc3/icrc3.factory.certified.did';
import { idlFactory as idlFactoryIcrc3 } from '$declarations/icrc3/icrc3.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import {
	Canister,
	createServices,
	fromNullable,
	toNullable,
	type QueryParams
} from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';

export class Icrc3Canister extends Canister<Icrc3Service> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<Icrc3Service>): Promise<Icrc3Canister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<Icrc3Service>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryIcrc3,
			certifiedIdlFactory: idlCertifiedFactoryIcrc3
		});

		return new Icrc3Canister(canisterId, service, certifiedService);
	}

	getArchives = async ({
		from,
		certified
	}: { from?: Principal } & QueryParams): Promise<GetArchivesResult> => {
		const { icrc3_get_archives } = this.caller({ certified });

		return await icrc3_get_archives({ from: toNullable(from) });
	};

	getBlocks = async ({
		args,
		certified
	}: { args: GetBlocksArgs } & QueryParams): Promise<GetBlocksResult> => {
		const { icrc3_get_blocks } = this.caller({ certified });

		return await icrc3_get_blocks(args);
	};

	getTipCertificate = async ({ certified }: QueryParams): Promise<DataCertificate | undefined> => {
		const { icrc3_get_tip_certificate } = this.caller({ certified });

		return fromNullable(await icrc3_get_tip_certificate());
	};

	supportedBlockTypes = async ({
		certified
	}: QueryParams): Promise<Array<{ url: string; block_type: string }>> => {
		const { icrc3_supported_block_types } = this.caller({ certified });

		return await icrc3_supported_block_types();
	};
}
