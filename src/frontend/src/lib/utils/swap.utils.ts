import type {
	SwapAmountsReply,
	SwapAmountsTxReply
} from '$declarations/kong_backend/kong_backend.did';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { ZERO_BI } from '$lib/constants/app.constants';
import type { SwapProviderResult } from '$lib/stores/swap-amounts.store';
import type { ProviderFee } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { findToken } from '$lib/utils/tokens.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { parseToken } from './parse.utils';

export const getSwapRoute = (transactions: SwapAmountsTxReply[]): string[] =>
	transactions.length === 0
		? []
		: [transactions[0].pay_symbol, ...transactions.map(({ receive_symbol }) => receive_symbol)];

export const getLiquidityFees = ({
	transactions,
	tokens
}: {
	transactions: SwapAmountsTxReply[];
	tokens: Token[];
}): ProviderFee[] =>
	transactions.length === 0
		? []
		: transactions.reduce<ProviderFee[]>((acc, { lp_fee, receive_symbol }) => {
				const token = findToken({ tokens, symbol: receive_symbol });
				if (nonNullish(token)) {
					return [...acc, { fee: lp_fee, token }];
				}
				return acc;
			}, []);

export const getNetworkFee = ({
	transactions,
	tokens
}: {
	transactions: SwapAmountsTxReply[];
	tokens: Token[];
}): ProviderFee | undefined => {
	if (transactions.length === 0) {
		return undefined;
	}
	const token = findToken({ tokens, symbol: transactions[transactions.length - 1].receive_symbol });
	if (isNullish(token)) {
		return undefined;
	}

	return {
		fee: transactions.reduce((acc, { gas_fee }) => acc + gas_fee, ZERO_BI),
		token
	};
};

export const getKongIcTokenIdentifier = (token: Token): string =>
	isIcToken(token) ? `IC.${token.ledgerCanisterId}` : '';

export const calculateSlippage = ({
	quoteAmount,
	slippagePercentage
}: {
	quoteAmount: bigint;
	slippagePercentage: number;
}): bigint => {
	const slippageFactor = BigInt(10000 - Math.floor(slippagePercentage * 100));
	return (quoteAmount * slippageFactor) / 10000n;
};

export const mapKongSwapResult = ({
	swap,
	tokens
}: {
	swap: SwapAmountsReply;
	tokens: Token[];
}): SwapProviderResult => ({
	provider: 'kongSwap',
	slippage: swap.slippage,
	receiveAmount: swap.receive_amount,
	route: getSwapRoute(swap.txs ?? []),
	liquidityFees: getLiquidityFees({ transactions: swap.txs ?? [], tokens }),
	networkFee: getNetworkFee({ transactions: swap.txs ?? [], tokens }),
	raw: swap
});

export const mapIcpSwapResult = ({
	swap
}: {
	swap: {
		receiveAmount: bigint;
		[key: string]: unknown;
	};
}): SwapProviderResult => ({
	provider: 'icpSwap',
	receiveAmount: swap.receiveAmount,
	raw: swap
});

interface FetchSwapOptionsParams {
	identity: Identity;
	sourceToken: Token;
	destinationToken: Token;
	amount: number;
	tokens: Token[];
}

import { kongSwapAmounts } from '$lib/api/kong_backend.api';
import { getIcpSwapAmounts } from '$lib/services/swap.services';
import type { Identity } from '@dfinity/agent';

export interface SwapQuoteParams {
	identity: Identity;
	sourceToken: Token;
	destinationToken: Token;
	sourceAmount: bigint;
}

export interface SwapResultMapParams<TSwapRaw> {
	swap: TSwapRaw;
	tokens?: Token[];
}

export interface SwapProvider<TSwapRaw> {
	id: string;
	getQuote: (params: SwapQuoteParams) => Promise<TSwapRaw>;
	mapResult: (params: SwapResultMapParams<TSwapRaw>) => SwapProviderResult;
}

export const swapProviders: SwapProvider<any>[] = [
	{
		id: 'kongSwap',
		getQuote: kongSwapAmounts,
		mapResult: ({ swap, tokens }) => mapKongSwapResult({ swap, tokens: tokens ?? [] })
	},
	{
		id: 'icpSwap',
		getQuote: getIcpSwapAmounts,
		mapResult: ({ swap }) => mapIcpSwapResult({ swap })
	}
];

//queryAndUpdate

export const fetchSwapOptions = async ({
	identity,
	sourceToken,
	destinationToken,
	amount,
	tokens
}: FetchSwapOptionsParams): Promise<SwapProviderResult[]> => {
	const sourceAmount = parseToken({
		value: `${amount}`,
		unitName: sourceToken.decimals
	});

	const baseParams = {
		identity,
		sourceToken,
		destinationToken,
		sourceAmount
	};

	const results = await Promise.allSettled(
		swapProviders.map((provider) => provider.getQuote(baseParams))
	);

	const swaps = results.reduce<SwapProviderResult[]>((acc, result, index) => {
		if (result.status !== 'fulfilled') {
			return acc;
		}

		try {
			const mapped = swapProviders[index].mapResult({ swap: result.value, tokens });
			acc.push(mapped);
		} catch (e: unknown) {
			console.error('Error mapping swap result:', e);
		}

		return acc;
	}, []);

	return swaps;
};
