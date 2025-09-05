import type {
	DepositArgs,
	PoolMetadata,
	Result,
	SwapArgs,
	_SERVICE as SwapPoolService,
	WithdrawArgs
} from '$declarations/icp_swap_pool/icp_swap_pool.did';
import { idlFactory as certifiedPoolIdlFactory } from '$declarations/icp_swap_pool/icp_swap_pool.factory.certified.did';
import { idlFactory as poolIdlFactory } from '$declarations/icp_swap_pool/icp_swap_pool.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import { mapIcpSwapFactoryError } from '$lib/canisters/icp-swap.errors';
import type { CreateCanisterOptions } from '$lib/types/canister';
import type { Principal } from '@dfinity/principal';
import { Canister, createServices } from '@dfinity/utils';

export class ICPSwapPoolCanister extends Canister<SwapPoolService> {
	static async create({ identity, ...options }: CreateCanisterOptions<SwapPoolService>) {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<SwapPoolService>({
			options: { ...options, agent },
			idlFactory: poolIdlFactory,
			certifiedIdlFactory: certifiedPoolIdlFactory
		});

		return new ICPSwapPoolCanister(canisterId, service, certifiedService);
	}

	/**
	 * Provides a quote for swapping tokens based on input parameters.
	 *
	 * @param args - Swap quote parameters: amountIn, zeroForOne, amountOutMinimum.
	 * @returns Estimated output amount (bigint).
	 * @throws CanisterInternalError if fetching quote fails.
	 */
	quote = async (args: SwapArgs): Promise<bigint> => {
		const { quote } = this.caller({ certified: false });
		const result: Result = await quote(args);

		if ('ok' in result) {
			return result.ok;
		}

		throw mapIcpSwapFactoryError(result.err);
	};

	/**
	 * Executes a swap transaction between two tokens.
	 *
	 * @param args - Swap parameters: amountIn, zeroForOne, amountOutMinimum.
	 * @returns Amount of tokens received (bigint).
	 * @throws CanisterInternalError if swap fails.
	 */
	swap = async (args: SwapArgs): Promise<bigint> => {
		const { swap } = this.caller({ certified: true });
		const result: Result = await swap(args);

		if ('ok' in result) {
			return result.ok;
		}

		throw mapIcpSwapFactoryError(result.err);
	};

	/**
	 * Deposits tokens into the swap pool.
	 *
	 * @param args - Deposit parameters: token Principal, amount, and fee.
	 * @returns Amount of tokens deposited (bigint).
	 * @throws CanisterInternalError if deposit fails.
	 */
	deposit = async (args: DepositArgs): Promise<bigint> => {
		const { deposit } = this.caller({ certified: true });
		const result: Result = await deposit(args);

		if ('ok' in result) {
			return result.ok;
		}

		throw mapIcpSwapFactoryError(result.err);
	};

	/**
	 * Deposits tokens into the swap pool using an approval from another account.
	 *
	 * @param args - DepositFrom parameters: token Principal, amount, and fee.
	 * @returns Amount of tokens deposited (bigint).
	 * @throws CanisterInternalError if depositFrom fails.
	 */
	depositFrom = async (args: DepositArgs): Promise<bigint> => {
		const { depositFrom } = this.caller({ certified: true });
		const result: Result = await depositFrom(args);

		if ('ok' in result) {
			return result.ok;
		}

		throw mapIcpSwapFactoryError(result.err);
	};

	/**
	 * Withdraws tokens from the swap pool to the user's account.
	 *
	 * @param args - Withdraw parameters: token Principal, amount, and fee.
	 * @returns Amount of tokens withdrawn (bigint).
	 * @throws CanisterInternalError if withdrawal fails.
	 */
	withdraw = async (args: WithdrawArgs): Promise<bigint> => {
		const { withdraw } = this.caller({ certified: true });
		const result: Result = await withdraw(args);

		if ('ok' in result) {
			return result.ok;
		}

		throw mapIcpSwapFactoryError(result.err);
	};

	/**
	 * Retrieves the user's unused token balances within the pool.
	 *
	 * @param principal - Principal of the user.
	 * @returns Object containing balance0 and balance1 (both bigint).
	 * @throws CanisterInternalError if fetching balances fails.
	 */
	getUserUnusedBalance = async (
		principal: Principal
	): Promise<{ balance0: bigint; balance1: bigint }> => {
		const { getUserUnusedBalance } = this.caller({ certified: false });
		const response = await getUserUnusedBalance(principal);

		if ('ok' in response) {
			return response.ok;
		}

		throw mapIcpSwapFactoryError(response.err);
	};

	/**
	 * Retrieves metadata for the pool.
	 *
	 * @returns Object containing PoolMetadata object.
	 * @throws CanisterInternalError if fetching metadata fails.
	 */
	getPoolMetadata = async (): Promise<PoolMetadata> => {
		const { metadata } = this.caller({ certified: false });
		const response = await metadata();

		if ('ok' in response) {
			return response.ok;
		}

		throw mapIcpSwapFactoryError(response.err);
	};
}
