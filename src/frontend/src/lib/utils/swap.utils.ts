import type { SwapAmountsTxReply } from '$declarations/kong_backend/kong_backend.did';
import type { ProviderFee } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { isNullish, nonNullish } from '@dfinity/utils';

export const getSwapRoute = (transactions: SwapAmountsTxReply[]): string[] => {
	const swapRoute: string[] = [];
	if (transactions.length === 0) {
		return swapRoute;
	}

	swapRoute.push(transactions[0].pay_symbol);
	transactions.forEach((transaction) => {
		swapRoute.push(transaction.receive_symbol);
	});

	return swapRoute;
};

export const getLiquidityFees = ({
									 transactions,
									 tokens

}: {
									 transactions: SwapAmountsTxReply[],
									 tokens: Token[]
}
): ProviderFee[] => {
	const liquidityFees: ProviderFee[] = [];
	if (transactions.length === 0) {
		return liquidityFees;
	}

	transactions.forEach((transaction) => {
		const token = findToken(tokens, transaction.receive_symbol);
		if (nonNullish(token)) {
			liquidityFees.push({
				fee: transaction.lp_fee,
				token
			});
		}
	});

	return liquidityFees;
};

export const getNetworkFee = ({
								  transactions,
								  tokens
							  }: {
								  transactions: SwapAmountsTxReply[],
								  tokens: Token[]
}

): ProviderFee | undefined => {
	if (transactions.length === 0) {
		return undefined;
	}
	const token = findToken(tokens, transactions[transactions.length - 1].receive_symbol);
	if (isNullish(token)) {
		return undefined;
	}

	return {
		fee: transactions.reduce((acc, { gas_fee }) => acc + gas_fee, BigInt(0)),
		token
	};
};

const findToken = (
	{
		tokens,
		symbol
	}: {
		tokens: Token[], symbol: string
	}

): Token | undefined =>
	tokens.find((token) => token.symbol === symbol);
