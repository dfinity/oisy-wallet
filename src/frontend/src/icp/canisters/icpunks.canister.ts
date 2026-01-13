import type { _SERVICE as IcPunksService } from '$declarations/icpunks/icpunks.did';
import { idlFactory as idlCertifiedFactoryIcPunks } from '$declarations/icpunks/icpunks.factory.certified.did';
import { idlFactory as idlFactoryIcPunks } from '$declarations/icpunks/icpunks.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, type QueryParams } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';

// This class can be used for all the IC NFT collection canisters that have an interface similar to ICPunks
export class IcPunksCanister extends Canister<IcPunksService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<IcPunksService>): Promise<IcPunksCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<IcPunksService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryIcPunks,
			certifiedIdlFactory: idlCertifiedFactoryIcPunks
		});

		return new IcPunksCanister(canisterId, service, certifiedService);
	}

	getTokensByOwner = async ({
		principal,
		certified
	}: { principal: Principal } & QueryParams): Promise<bigint[]> => {
		const { user_tokens } = this.caller({ certified });

		return await user_tokens(principal);
	};

	transfer = async ({
		certified,
		to,
		tokenIdentifier
	}: { to: Principal; tokenIdentifier: bigint } & QueryParams): Promise<boolean> => {
		const { transfer_to } = this.caller({ certified });

		return await transfer_to(to, tokenIdentifier);
	};
}
