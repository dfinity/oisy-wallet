import type { _SERVICE as IcpIndexService } from '$declarations/icp_index/icp_index.did';
import { idlFactory as idlCertifiedFactoryIcpIndex } from '$declarations/icp_index/icp_index.factory.certified.did';
import { idlFactory as idlFactoryIcpIndex } from '$declarations/icp_index/icp_index.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, type QueryParams } from '@dfinity/utils';

// What the ICP index says about itself. The `IcpIndexCanister` of `@icp-sdk/canisters` only
// reads histories and balances.
export class IcpIndexStatusCanister extends Canister<IcpIndexService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<IcpIndexService>): Promise<IcpIndexStatusCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<IcpIndexService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryIcpIndex,
			certifiedIdlFactory: idlCertifiedFactoryIcpIndex
		});

		return new IcpIndexStatusCanister(canisterId, service, certifiedService);
	}

	/**
	 * How many ledger blocks the index has taken. It takes them in order, so every block
	 * below this height is already in the histories it serves.
	 */
	numBlocksSynced = async ({ certified }: QueryParams): Promise<bigint> => {
		const { num_blocks_synced } = await this.caller({ certified }).status();

		return num_blocks_synced;
	};
}
