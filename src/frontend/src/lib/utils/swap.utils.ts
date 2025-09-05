import type {
	SwapAmountsReply,
	SwapAmountsTxReply
} from '$declarations/kong_backend/kong_backend.did';
import { dAppDescriptions } from '$env/dapp-descriptions.env';
import type { Erc20Token } from '$eth/types/erc20';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { ZERO } from '$lib/constants/app.constants';
import {
	SWAP_DEFAULT_SLIPPAGE_VALUE,
	SWAP_ETH_TOKEN_PLACEHOLDER,
	swapProvidersDetails
} from '$lib/constants/swap.constants';
import { SwapError } from '$lib/services/swap-errors.services';
import type { AmountString } from '$lib/types/amount';
import type { OisyDappDescription } from '$lib/types/dapp-description';
import {
	SwapProvider,
	VeloraSwapTypes,
	type FormatSlippageParams,
	type GetWithdrawableTokenParams,
	type ICPSwapResult,
	type ProviderFee,
	type Slippage,
	type SwapMappedResult,
	type SwapProvidersConfig,
	type VeloraSwapDetails
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { findToken } from '$lib/utils/tokens.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { BridgePrice, DeltaPrice, OptimalRate } from '@velora-dex/sdk';
import { formatToken } from './format.utils';
import { isNullishOrEmpty } from './input.utils';

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
		fee: transactions.reduce((acc, { gas_fee }) => acc + gas_fee, ZERO),
		token
	};
};

export const getKongIcTokenIdentifier = (token: Token): string =>
	isIcToken(token) ? `IC.${token.ledgerCanisterId}` : '';

export const mapIcpSwapResult = ({
	swap,
	slippage
}: {
	swap: ICPSwapResult;
	slippage: Slippage;
}): SwapMappedResult => {
	const parsedSlippage = Number(slippage);
	const slippagePercentage = parsedSlippage > 0 ? parsedSlippage : SWAP_DEFAULT_SLIPPAGE_VALUE;
	return {
		provider: SwapProvider.ICP_SWAP,
		receiveAmount: swap.receiveAmount,
		receiveOutMinimum: calculateSlippage({
			quoteAmount: swap.receiveAmount,
			slippagePercentage
		}),
		swapDetails: swap
	};
};

export const mapKongSwapResult = ({
	swap,
	tokens
}: {
	swap: SwapAmountsReply;
	tokens: Token[];
}): SwapMappedResult => ({
	provider: SwapProvider.KONG_SWAP,
	slippage: swap.slippage,
	receiveAmount: swap.receive_amount,
	route: getSwapRoute(swap.txs ?? []),
	liquidityFees: getLiquidityFees({ transactions: swap.txs ?? [], tokens }),
	networkFee: getNetworkFee({ transactions: swap.txs ?? [], tokens }),
	swapDetails: swap
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
	const factor = 1 - slippagePercentage / 100;
	return BigInt(Math.floor(Number(quoteAmount) * factor));
};

/**
 * Formats the minimum expected receive amount after applying slippage.
 *
 * @param {OptionAmount} params.slippageValue - The slippage percentage (as string or number or undefined).
 * @param {number} params.receiveAmount - The original quoted amount to receive.
 * @param {number} params.decimals - The number of decimal places for the token.
 * @returns {AmountString | null} A formatted string representing the minimum amount the user can expect to receive,
 * formatted with the token's decimals, or `null` if any required value is missing.
 *
 */
export const formatReceiveOutMinimum = ({
	slippageValue,
	receiveAmount,
	decimals
}: FormatSlippageParams): AmountString | undefined => {
	if (isNullishOrEmpty(slippageValue?.toString())) {
		return;
	}
	const receiveOutMinimum = calculateSlippage({
		quoteAmount: receiveAmount,
		slippagePercentage: Number(slippageValue)
	});

	return formatToken({
		value: receiveOutMinimum,
		unitName: decimals,
		displayDecimals: decimals
	});
};

export const mapVeloraSwapResult = (swap: DeltaPrice | BridgePrice): SwapMappedResult => ({
	provider: SwapProvider.VELORA,
	receiveAmount: 'bridge' in swap ? BigInt(swap.destAmountAfterBridge) : BigInt(swap.destAmount),
	swapDetails: swap as VeloraSwapDetails,
	type: VeloraSwapTypes.DELTA
});

export const mapVeloraMarketSwapResult = (swap: OptimalRate): SwapMappedResult => ({
	provider: SwapProvider.VELORA,
	receiveAmount: BigInt(swap.destAmount),
	swapDetails: swap as VeloraSwapDetails,
	type: VeloraSwapTypes.MARKET
});

export const geSwapEthTokenAddress = (token: Erc20Token) => {
	if (isDefaultEthereumToken(token)) {
		return SWAP_ETH_TOKEN_PLACEHOLDER;
	}

	return token.address;
};

export const isSwapError = (err: unknown): err is SwapError => err instanceof SwapError;

export const getWithdrawableToken = ({
	tokenAddress,
	sourceToken,
	destinationToken
}: GetWithdrawableTokenParams): IcTokenToggleable => {
	if (tokenAddress === sourceToken.ledgerCanisterId) {
		return sourceToken;
	}

	if (tokenAddress === destinationToken.ledgerCanisterId) {
		return destinationToken;
	}

	throw new Error(`Unknown token address`);
};

export const findSwapProvider = (
	providerId: string
): OisyDappDescription | SwapProvidersConfig | undefined => {
	const normalizedId = providerId.toLowerCase();
	const icDAppProvider = dAppDescriptions.find(({ id }) => id === normalizedId);

	if (icDAppProvider) {
		return icDAppProvider;
	}

	const swapProviderDetails = swapProvidersDetails[normalizedId];

	if (swapProviderDetails) {
		return {
			id: normalizedId,
			...swapProviderDetails
		};
	}
};
