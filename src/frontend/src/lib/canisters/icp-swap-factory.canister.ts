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
import { Canister, createServices, type QueryParams } from '@dfinity/utils';

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
	 * Certified by default: the returned canister ID can become the spender of an ICRC-2 approval
	 * and the target of a deposit, so only a caller that moves no funds should opt into the query.
	 *
	 * @param params - Pool search parameters: token0, token1, and fee, plus whether to certify the call.
	 * @returns Pool information containing the canister ID.
	 * @throws CanisterInternalError if fetching pool fails.
	 */
	getPool = async ({ certified = true, ...args }: GetPoolArgs & QueryParams): Promise<PoolData> => {
		const { getPool } = this.caller({ certified });
		const result = await getPool(args);

		if ('ok' in result) {
			return result.ok;
		}

		throw mapIcpSwapFactoryError(result.err);
	};

	/**
	 * Fetches all pools from the factory.
	 * Read-only (uncertified query call).
	 *
	 * @returns Array of all pool data.
	 * @throws CanisterInternalError if fetching pools fails.
	 */
	getPools = async (): Promise<PoolData[]> => {
		const { getPools } = this.caller({ certified: false });
		const result = await getPools();

		if ('ok' in result) {
			return result.ok;
		}

		throw mapIcpSwapFactoryError(result.err);
	};
}
