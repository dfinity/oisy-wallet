import type { SwapAmountsTxReply } from '$declarations/kong_backend/kong_backend.did';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { ZERO_BI } from '$lib/constants/app.constants';
import type { ProviderFee } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { findToken } from '$lib/utils/tokens.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

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
