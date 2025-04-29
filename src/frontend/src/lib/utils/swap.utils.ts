import type {
	SwapAmountsReply,
	SwapAmountsTxReply
} from '$declarations/kong_backend/kong_backend.did';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { ZERO_BI } from '$lib/constants/app.constants';
import { ICP_SWAP_PROVIDER, KONG_SWAP_PROVIDER } from '$lib/constants/swap.constants';
import type { SwapProviderResult } from '$lib/stores/swap-amounts.store';
import type { ICPSwapRawResult, ProviderFee } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { findToken } from '$lib/utils/tokens.utils';
import type { Principal } from '@dfinity/principal';
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

export const mapIcpSwapResult = ({ swap }: { swap: ICPSwapRawResult }): SwapProviderResult => ({
	provider: ICP_SWAP_PROVIDER,
	receiveAmount: swap.receiveAmount,
	receiveOutMinimum: calculateSlippage({
		quoteAmount: swap.receiveAmount,
		slippagePercentage: Number(swap.slippage)
	}) || undefined,
	rawSwap: swap
});

export const mapKongSwapResult = ({
	swap,
	tokens
}: {
	swap: SwapAmountsReply;
	tokens: Token[];
}): SwapProviderResult => ({
	provider: KONG_SWAP_PROVIDER,
	slippage: swap.slippage,
	receiveAmount: swap.receive_amount,
	route: getSwapRoute(swap.txs ?? []),
	liquidityFees: getLiquidityFees({ transactions: swap.txs ?? [], tokens }),
	networkFee: getNetworkFee({ transactions: swap.txs ?? [], tokens }),
	rawSwap: swap
});

/**
 * Calculates the minimum acceptable amount after applying slippage tolerance.
 *
 * This is typically used when performing swaps to ensure that
 * the received amount doesn't fall below the expected slippage tolerance.
 *
 * @param params - Parameters to calculate slippage
 * @param params.quoteAmount - The quoted amount without slippage (in smallest token units, e.g., wei)
 * @param params.slippagePercentage - The allowed slippage percentage (e.g., 0.5 for 0.5%)
 * @returns The minimum amount after slippage, as bigint
 *
 */
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

/**
 * Generates a 32-byte subaccount identifier from a Principal.
 *
 * In ICPSwap, users' token deposits
 * are often isolated using a "subaccount" derived from their Principal,
 * to allow smart contracts to distinguish between different users' funds.
 *
 * @param principal - The user's Principal (account identifier)
 * @returns A 32-byte Uint8Array representing the subaccount
 *
 */
export function getSwapSubaccount(principal: Principal): Uint8Array {
	const principalBytes = principal.toUint8Array();
	const subaccount = new Uint8Array(32);
	subaccount[0] = principalBytes.length;
	subaccount.set(principalBytes, 1);
	return subaccount;
}
