import { getPoolCanister } from '$lib/api/icp-swap-factory.api';
import { getQuote } from '$lib/api/icp-swap-pool.api';
import { ICP_SWAP_POOL_FEE } from '$lib/constants/swap.constants';
import type { ICPSwapAmountReply, ICPSwapQuoteParams } from '$lib/types/api';

export const icpSwapAmounts = async ({
	identity,
	sourceToken,
	destinationToken,
	sourceAmount,
	fee = ICP_SWAP_POOL_FEE // The only supported pool fee on ICPSwap at the moment (0.3%)
}: ICPSwapQuoteParams): Promise<ICPSwapAmountReply> => {
	const pool = await getPoolCanister({
		identity,
		token0: { address: sourceToken.ledgerCanisterId, standard: sourceToken.standard },
		token1: { address: destinationToken.ledgerCanisterId, standard: destinationToken.standard },
		fee
	});

	const quote = await getQuote({
		identity,
		canisterId: pool.canisterId.toString(),
		amountIn: sourceAmount.toString(),
		zeroForOne: pool.token0.address === sourceToken.ledgerCanisterId,
		amountOutMinimum: '0' // No minimum here as this is just a quote; slippage protection applies only during actual swap
	});

	return { receiveAmount: quote };
};
