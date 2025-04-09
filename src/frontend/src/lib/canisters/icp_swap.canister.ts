import type { _SERVICE as SwapFactoryService } from '$declarations/icp_swap/icp_swap.did';

import { idlFactory } from '$declarations/icp_swap/icp_swap.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices } from '@dfinity/utils';

export class ICPSwapFactoryCanister extends Canister<SwapFactoryService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<SwapFactoryService>): Promise<ICPSwapFactoryCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<SwapFactoryService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactory,
			certifiedIdlFactory: idlFactory
		});

		return new ICPSwapFactoryCanister(canisterId, service, certifiedService);
	}

	getPool = async (args: {
		token0: { address: string; standard: string };
		token1: { address: string; standard: string };
		fee: bigint;
	}) => {
		const { getPool } = this.caller({ certified: false });
		const result = await getPool(args);

		if ('ok' in result) {return result.ok;}
		throw new Error(`getPool failed: ${  JSON.stringify(result.err)}`);
	};
}
