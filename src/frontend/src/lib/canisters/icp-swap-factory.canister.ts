import type {
	GetPoolArgs,
	PoolData,
	_SERVICE as SwapFactoryService
} from '$declarations/icp_swap_factory/icp_swap_factory.did';
import { idlFactory as certifiedFactoryIdlFactory } from '$declarations/icp_swap_factory/icp_swap_factory.factory.certified.did';
import { idlFactory as factoryIdlFactory } from '$declarations/icp_swap_factory/icp_swap_factory.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import { mapIcpSwapFactoryError } from '$lib/canisters/icp-swap.errors';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices } from '@dfinity/utils';

export class ICPSwapFactoryCanister extends Canister<SwapFactoryService> {
	static async create({ identity, ...options }: CreateCanisterOptions<SwapFactoryService>) {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<SwapFactoryService>({
			options: { ...options, agent },
			idlFactory: factoryIdlFactory,
			certifiedIdlFactory: certifiedFactoryIdlFactory
		});

		return new ICPSwapFactoryCanister(canisterId, service, certifiedService);
	}

	/**
	 * Fetches pool information by given tokens and fee.
	 * Read-only (uncertified query call).
	 *
	 * @param args - Pool search parameters: token0, token1, and fee.
	 * @returns Pool information containing the canister ID.
	 * @throws CanisterInternalError if fetching pool fails.
	 */
	getPool = async (args: GetPoolArgs): Promise<PoolData> => {
		const { getPool } = this.caller({ certified: false });
		const result = await getPool(args);

		if ('ok' in result) {
			return result.ok;
		}

		throw mapIcpSwapFactoryError(result.err);
	};
}
