import type {
	DepositArgs as ICPSwapDepositRequest,
	GetPoolArgs as ICPSwapGetPoolArgs,
	SwapArgs as ICPSwapSwapRequest,
	WithdrawArgs as ICPSwapWithdrawRequest,
	_SERVICE as SwapFactoryService
} from '$declarations/icp_swap/icp_swap.did.ts';

import { idlFactory } from '$declarations/icp_swap/icp_swap.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import type { Principal } from '@dfinity/principal';
import { Canister, createServices } from '@dfinity/utils';
import { mapIcpSwapCanisterError } from './icp_swap.errors';

export class ICPSwapFactoryCanister extends Canister<SwapFactoryService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<SwapFactoryService>): Promise<ICPSwapFactoryCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<SwapFactoryService>({
			options: { ...options, agent },
			idlFactory,
			certifiedIdlFactory: idlFactory
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
	getPool = async (args: ICPSwapGetPoolArgs) => {
		const { getPool } = this.caller({ certified: false });
		const response = await getPool(args);

		if ('ok' in response) {
			return response.ok;
		}
		throw mapIcpSwapCanisterError(response.err);
	};

	/**
	 * Provides a quote for swapping tokens based on input parameters.
	 *
	 * @param args - Swap quote parameters: amountIn, zeroForOne, amountOutMinimum.
	 * @returns Estimated output amount (bigint).
	 * @throws CanisterInternalError if fetching quote fails.
	 */
	quote = async (args: ICPSwapSwapRequest) => {
		const { quote } = this.caller({ certified: false });
		const response = await quote(args);

		if ('ok' in response) {
			return response.ok;
		}
		throw mapIcpSwapCanisterError(response.err);
	};

	/**
	 * Executes a swap transaction between two tokens.
	 *
	 * @param args - Swap parameters: amountIn, zeroForOne, amountOutMinimum.
	 * @returns Amount of tokens received (bigint).
	 * @throws CanisterInternalError if swap fails.
	 */
	swap = async (args: ICPSwapSwapRequest) => {
		const { swap } = this.caller({ certified: true });
		const response = await swap(args);

		if ('ok' in response) {
			return response.ok;
		}
		throw mapIcpSwapCanisterError(response.err);
	};

	/**
	 * Deposits tokens into the swap pool.
	 *
	 * @param args - Deposit parameters: token Principal, amount, and fee.
	 * @returns Amount of tokens deposited (bigint).
	 * @throws CanisterInternalError if deposit fails.
	 */
	deposit = async (args: ICPSwapDepositRequest) => {
		const { deposit } = this.caller({ certified: true });
		const response = await deposit(args);

		if ('ok' in response) {
			return response.ok;
		}
		throw mapIcpSwapCanisterError(response.err);
	};

	/**
	 * Deposits tokens into the swap pool using an approval from another account.
	 *
	 * @param args - DepositFrom parameters: token Principal, amount, and fee.
	 * @returns Amount of tokens deposited (bigint).
	 * @throws CanisterInternalError if depositFrom fails.
	 */
	depositFrom = async (args: ICPSwapDepositRequest) => {
		const { depositFrom } = this.caller({ certified: true });
		const response = await depositFrom(args);

		if ('ok' in response) {
			return response.ok;
		}
		throw mapIcpSwapCanisterError(response.err);
	};

	/**
	 * Withdraws tokens from the swap pool to the user's account.
	 *
	 * @param args - Withdraw parameters: token Principal, amount, and fee.
	 * @returns Amount of tokens withdrawn (bigint).
	 * @throws CanisterInternalError if withdrawal fails.
	 */
	withdraw = async (args: ICPSwapWithdrawRequest) => {
		const { withdraw } = this.caller({ certified: true });
		const response = await withdraw(args);

		if ('ok' in response) {
			return response.ok;
		}
		throw mapIcpSwapCanisterError(response.err);
	};

	/**
	 * Retrieves the user's unused token balances within the pool.
	 *
	 * @param principal - Principal of the user.
	 * @returns Object containing balance0 and balance1 (both bigint).
	 * @throws CanisterInternalError if fetching balances fails.
	 */
	getUserUnusedBalance = async (principal: Principal) => {
		const { getUserUnusedBalance } = this.caller({ certified: false });
		const response = await getUserUnusedBalance(principal);

		if ('ok' in response) {
			return response.ok;
		}
		throw mapIcpSwapCanisterError(response.err);
	};
}
