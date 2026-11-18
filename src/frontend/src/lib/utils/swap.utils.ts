import type {
	ICTokenReply,
	SwapAmountsReply,
	SwapAmountsTxReply,
	TokenReply
} from '$declarations/kong_backend/kong_backend.did';
import { dAppDescriptions } from '$env/dapp-descriptions.env';
import type { ErcFungibleToken } from '$eth/types/erc-fungible';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { ZERO } from '$lib/constants/app.constants';
import {
	NEAR_INTENTS_BLOCKCHAIN_MAP,
	SWAP_DEFAULT_SLIPPAGE_VALUE,
	SWAP_ETH_TOKEN_PLACEHOLDER,
	SWAP_SLIPPAGE_INVALID_VALUE,
	SWAP_SLIPPAGE_VELORA_INVALID_VALUE,
	SWAP_SLIPPAGE_WARNING_VALUE,
	swapProvidersDetails
} from '$lib/constants/swap.constants';
import { SwapError } from '$lib/services/swap-errors.services';
import type { AmountString } from '$lib/types/amount';
import type { OisyDappDescription } from '$lib/types/dapp-description';
import type {
	NearIntentsQuoteRequest,
	NearIntentsQuoteResponse,
	NearIntentsToken
} from '$lib/types/near-intents';
import type { NetworkId } from '$lib/types/network';
import type { Amount, OptionAmount } from '$lib/types/send';
import {
	SwapErrorCodes,
	SwapProvider,
	VeloraSwapTypes,
	type DeltaSwapResponse,
	type FormatSlippageParams,
	type GetWithdrawableTokenParams,
	type ICPSwapResult,
	type ProviderFee,
	type Slippage,
	type SwapMappedResult,
	type SwapProvidersConfig,
	type SwapSlippageStatus
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { usdValue } from '$lib/utils/exchange.utils';
import { formatToken } from '$lib/utils/format.utils';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { isNetworkIdICP } from '$lib/utils/network.utils';
import { loadSwapSlippage, saveSwapSlippage } from '$lib/utils/swap-slippage-storage.utils';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import { findToken } from '$lib/utils/tokens.utils';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { OptimalRate } from '@velora-dex/sdk';

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
	slippage,
	destToken
}: {
	swap: ICPSwapResult;
	slippage: Slippage;
	destToken: IcToken;
}): SwapMappedResult => {
	const parsedSlippage = Number(slippage);
	const slippagePercentage = parsedSlippage > 0 ? parsedSlippage : SWAP_DEFAULT_SLIPPAGE_VALUE;
	const receiveAmountNet = swap.receiveAmount - destToken.fee;

	return {
		provider: SwapProvider.ICP_SWAP,
		receiveAmount: receiveAmountNet > 0 ? receiveAmountNet : ZERO,
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
 * Converts a slippage percentage into the integer basis points some providers (e.g. Velora) require.
 *
 * The fractional part is dropped rather than rounded so an order can never allow more slippage
 * than the user accepted (1.005% must become 100 bps, not 101). Flooring the raw product alone
 * would lose a whole basis point to IEEE-754 noise (0.29 * 100 === 28.999…), so the noise is
 * rounded away first. The 1e-6 bps precision is deliberately independent of the slippage input's
 * decimal limit so the invariant holds even for a value that bypassed the input: it only needs to
 * stay far coarser than float noise (~1e-14) and finer than any granularity a caller could mean.
 * The absolute value guards against a negative value slipping past input validation and reaching
 * a provider as negative slippage.
 */
export const slippagePercentToBasisPoints = (slippageValue: Amount): number => {
	const basisPoints = Math.abs(Number(slippageValue)) * 100;
	return Math.floor(Math.round(basisPoints * 1e6) / 1e6);
};

/**
 * The lowest slippage a swap from this network refuses, in percent: ICP swaps accept a wider
 * tolerance than Velora, whose limit applies to every other source network.
 */
export const getSwapSlippageInvalidValue = (networkId: NetworkId | undefined): number =>
	isNetworkIdICP(networkId) ? SWAP_SLIPPAGE_INVALID_VALUE : SWAP_SLIPPAGE_VELORA_INVALID_VALUE;

/**
 * Whether a slippage can be swapped with, and whether it is high enough to warn about. An empty
 * value counts as 0 %, which no swap accepts: written as "not inside the range" so that a value
 * that is not a number is refused too.
 */
export const getSwapSlippageStatus = ({
	slippageValue,
	maxSlippageInvalidValue
}: {
	slippageValue: OptionAmount;
	maxSlippageInvalidValue: number;
}): SwapSlippageStatus => {
	const value = nonNullish(slippageValue) ? Number(slippageValue) : 0;

	if (!(value > 0 && value < maxSlippageInvalidValue)) {
		return 'invalid';
	}

	return value >= SWAP_SLIPPAGE_WARNING_VALUE ? 'warning' : 'valid';
};

/**
 * A slippage percentage with at most two decimals, for a place too narrow for the four the input
 * takes. Cut rather than rounded, so a value never reads as more than it is (49.996 must not show
 * as the refused 50), with the float noise rounded away first as in `slippagePercentToBasisPoints`.
 * A value below 0.01 keeps its own digits rather than reading as a refused 0.
 */
export const formatSwapSlippageShort = (value: number): string => {
	const cut = Math.trunc(Math.round(value * 1e8) / 1e6) / 100;

	return `${cut === 0 ? value : cut}`;
};

export const getInitialSwapSlippage = (): OptionAmount =>
	loadSwapSlippage() ?? SWAP_DEFAULT_SLIPPAGE_VALUE;

export const keepSwapSlippage = (slippageValue: OptionAmount) => {
	// The next swap may start from any network.
	const status = getSwapSlippageStatus({
		slippageValue,
		maxSlippageInvalidValue: Math.min(
			SWAP_SLIPPAGE_INVALID_VALUE,
			SWAP_SLIPPAGE_VELORA_INVALID_VALUE
		)
	});

	if (status !== 'invalid') {
		saveSwapSlippage(slippageValue);
	}
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

export const mapVeloraSwapResult = ({ delta }: DeltaSwapResponse): SwapMappedResult => ({
	provider: SwapProvider.VELORA,
	// The destination step of the route is already denominated in the destination token, on the
	// destination chain. Reading it here also covers cross-chain quotes whose two tokens have
	// different decimals — the bridge scaling factor is applied by Velora before we see it.
	receiveAmount: BigInt(delta.route.destination.output.amount),
	swapDetails: delta,
	type: VeloraSwapTypes.DELTA
});

export const mapVeloraMarketSwapResult = (swap: OptimalRate): SwapMappedResult => ({
	provider: SwapProvider.VELORA,
	receiveAmount: BigInt(swap.destAmount),
	swapDetails: swap,
	type: VeloraSwapTypes.MARKET
});

// 1Click states amounts in base units as decimal strings. Read through `Number`, anything above
// `Number.MAX_SAFE_INTEGER` (about 0.009 of an 18-decimal token) would round, so the whole part is
// taken from the string itself; only a form that is not plain digits goes through `Number`.
const nearIntentsAmountToBigInt = (amount: string): bigint => {
	const whole = /^(\d+)(?:\.\d*)?$/.exec(amount)?.[1];

	return nonNullish(whole) ? BigInt(whole) : BigInt(Math.floor(Number(amount)));
};

export const mapNearIntentsQuoteResult = (quote: NearIntentsQuoteResponse): SwapMappedResult => ({
	provider: SwapProvider.NEAR_INTENTS,
	receiveAmount: nearIntentsAmountToBigInt(quote.quote.amountOut),
	receiveOutMinimum: nonNullish(quote.quote.minAmountOut)
		? nearIntentsAmountToBigInt(quote.quote.minAmountOut)
		: undefined,
	swapDetails: quote
});

export const resolveNearIntentsBlockchain = (networkId: NetworkId): string | undefined =>
	NEAR_INTENTS_BLOCKCHAIN_MAP[networkId];

export const findNearIntentsAsset = ({
	tokens,
	token,
	blockchain
}: {
	tokens: NearIntentsToken[];
	token: Token;
	blockchain: string;
}): NearIntentsToken | undefined =>
	tokens.find(
		(t) =>
			t.blockchain === blockchain &&
			(isNullish(t.contractAddress)
				? // Native tokens
					t.symbol.toLowerCase() === token.symbol.toLowerCase()
				: isTokenErc20(token) || isTokenSpl(token)
					? areAddressesEqual({
							address1: t.contractAddress,
							address2: token.address,
							networkId: token.network.id
						})
					: false)
	);

export const resolveNearIntentsSwapAssets = ({
	nearTokens,
	sourceToken,
	destinationToken
}: {
	nearTokens: NearIntentsToken[];
	sourceToken: Token;
	destinationToken: Token;
}): { srcAsset: NearIntentsToken; destAsset: NearIntentsToken } | undefined => {
	const srcBlockchain = resolveNearIntentsBlockchain(sourceToken.network.id);
	const destBlockchain = resolveNearIntentsBlockchain(destinationToken.network.id);

	if (isNullish(srcBlockchain) || isNullish(destBlockchain)) {
		return;
	}

	const srcAsset = findNearIntentsAsset({
		tokens: nearTokens,
		token: sourceToken,
		blockchain: srcBlockchain
	});

	const destAsset = findNearIntentsAsset({
		tokens: nearTokens,
		token: destinationToken,
		blockchain: destBlockchain
	});

	if (isNullish(srcAsset) || isNullish(destAsset)) {
		return;
	}

	return { srcAsset, destAsset };
};

export const buildNearIntentsQuoteRequest = ({
	slippageTolerance,
	srcAsset,
	destAsset,
	amount,
	userAddress,
	recipientAddress,
	deadlineMs
}: {
	slippageTolerance: number;
	srcAsset: NearIntentsToken;
	destAsset: NearIntentsToken;
	amount: bigint;
	userAddress: string;
	recipientAddress?: string;
	deadlineMs: number;
}): NearIntentsQuoteRequest => ({
	dry: false,
	swapType: 'EXACT_INPUT',
	slippageTolerance,
	originAsset: srcAsset.assetId,
	depositType: 'ORIGIN_CHAIN',
	destinationAsset: destAsset.assetId,
	amount: amount.toString(),
	recipient: recipientAddress ?? userAddress,
	recipientType: 'DESTINATION_CHAIN',
	refundTo: userAddress,
	refundType: 'ORIGIN_CHAIN',
	deadline: new Date(Date.now() + deadlineMs).toISOString()
});

export const geSwapEthTokenAddress = (token: ErcFungibleToken) => {
	if (isDefaultEthereumToken(token)) {
		return SWAP_ETH_TOKEN_PLACEHOLDER;
	}

	return token.address;
};

export const isSwapError = (err: unknown): err is SwapError => err instanceof SwapError;

// The NEAR Intents pre-send gates abort before any funds move, so their message explains a
// safe outcome rather than a failure. The wizards surface it verbatim instead of collapsing
// it into their generic "something went wrong" text.
const NEAR_INTENTS_QUOTE_REJECTED_CODES: SwapErrorCodes[] = [
	SwapErrorCodes.NEAR_INTENTS_QUOTE_UNVERIFIED,
	SwapErrorCodes.NEAR_INTENTS_QUOTE_EXPIRED,
	SwapErrorCodes.NEAR_INTENTS_QUOTE_SLIPPAGE,
	SwapErrorCodes.NEAR_INTENTS_QUOTE_DEPOSIT_MEMO
];

export const nearIntentsQuoteRejectedMessage = (err: unknown): string | undefined =>
	isSwapError(err) && NEAR_INTENTS_QUOTE_REJECTED_CODES.includes(err.code)
		? err.message
		: undefined;

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

	const exactMatch = swapProvidersDetails[providerId as SwapProvider];

	if (nonNullish(exactMatch)) {
		return { id: providerId, ...exactMatch };
	}

	const normalizedMatch = swapProvidersDetails[normalizedId as SwapProvider];

	if (nonNullish(normalizedMatch)) {
		return { id: normalizedId, ...normalizedMatch };
	}
};

export const calculateValueDifference = ({
	swapAmount,
	receiveAmount,
	sourceTokenExchangeRate,
	destinationTokenExchangeRate
}: {
	swapAmount: OptionAmount;
	receiveAmount?: number;
	sourceTokenExchangeRate?: number;
	destinationTokenExchangeRate?: number;
}): number | undefined => {
	const paidValue =
		nonNullish(swapAmount) && nonNullish(sourceTokenExchangeRate)
			? Number(swapAmount) * sourceTokenExchangeRate
			: undefined;

	if (isNullish(paidValue) || paidValue === 0) {
		return;
	}

	const receivedValue =
		nonNullish(receiveAmount) && nonNullish(destinationTokenExchangeRate)
			? receiveAmount * destinationTokenExchangeRate
			: undefined;

	if (isNullish(receivedValue)) {
		return;
	}

	return ((receivedValue - paidValue) / paidValue) * 100;
};

// What the selected offer is worth above the lowest offer, in USD. Offers are ranked by receive
// amount, so this is the same measure that makes an offer the best rate. `undefined` when there
// is nothing to compare, no price to compare in, or no gain.
export const calculateSwapGainUsd = ({
	swaps,
	selectedProvider,
	decimals,
	exchangeRate
}: {
	swaps: SwapMappedResult[];
	selectedProvider: SwapMappedResult;
	decimals: number;
	exchangeRate: number | undefined;
}): number | undefined => {
	if (swaps.length < 2 || isNullish(exchangeRate)) {
		return;
	}

	const lowest = swaps.reduce(
		(min, { receiveAmount }) => (receiveAmount < min ? receiveAmount : min),
		selectedProvider.receiveAmount
	);
	const gain = selectedProvider.receiveAmount - lowest;

	if (gain <= ZERO) {
		return;
	}

	return usdValue({ decimals, balance: gain, exchangeRate });
};

export const isKongSupportedIcToken = (token: TokenReply): token is { IC: ICTokenReply } =>
	'IC' in token && !token.IC.is_removed && token.IC.chain === 'IC';

/**
 * Whether a token can be picked to pay a swap with: it must be enabled, and its balance must not be
 * zero. An enabled token whose balance is still loading can be picked. A token that is not enabled
 * can still be received, since the swap enables it.
 */
export const canPayWithToken = (token: TokenUi): boolean => {
	if (isTokenToggleable(token) && !token.enabled) {
		return false;
	}

	const { balance } = token;

	return isNullish(balance) || balance > ZERO;
};
