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
	SUPPORTED_CROSS_SWAP_NETWORKS,
	SWAP_DEFAULT_SLIPPAGE_VALUE,
	SWAP_ETH_TOKEN_PLACEHOLDER,
	SWAP_SLIPPAGE_INVALID_VALUE,
	SWAP_SLIPPAGE_VELORA_INVALID_VALUE,
	SWAP_SLIPPAGE_WARNING_VALUE,
	swapProvidersDetails
} from '$lib/constants/swap.constants';
import type { Languages } from '$lib/enums/languages';
import { SwapError } from '$lib/services/swap-errors.services';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { SwapSupportedTokensData } from '$lib/stores/swap-supported-tokens.store';
import type { AmountString } from '$lib/types/amount';
import type { OisyDappDescription } from '$lib/types/dapp-description';
import type { ExchangesData } from '$lib/types/exchange';
import type {
	NearIntentsQuoteRequest,
	NearIntentsQuoteResponse,
	NearIntentsToken
} from '$lib/types/near-intents';
import type { Network, NetworkId } from '$lib/types/network';
import type { Amount, OptionAmount } from '$lib/types/send';
import type { StakeBalances } from '$lib/types/stake-balance';
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
import type { Token, TokenToPin } from '$lib/types/token';
import type { TokenGroupData } from '$lib/types/token-group';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import type { TokenUi } from '$lib/types/token-ui';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { usdValue } from '$lib/utils/exchange.utils';
import { formatToken } from '$lib/utils/format.utils';
import { formatList, replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { filterTokensForSelectedNetwork, isNetworkIdICP } from '$lib/utils/network.utils';
import { loadSwapSlippage, saveSwapSlippage } from '$lib/utils/swap-slippage-storage.utils';
import { filterSwapTokens, networksWithSupport } from '$lib/utils/swap-tokens-filter.utils';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import { getTokenDisplaySymbol, mapTokenUi } from '$lib/utils/token.utils';
import { findToken, sortTokens } from '$lib/utils/tokens.utils';
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

/**
 * The networks a pay token reaches: the static cross-swap pre-filter, intersected with the networks
 * that have a destination the providers supporting it reach. Before the providers' data is in, the
 * pre-filter alone. `undefined` for no constraint.
 */
const getReceiveNetworkIdsFromSupportedTokens = ({
	sourceToken,
	networks,
	supportedTokens
}: {
	sourceToken: Token;
	networks: Network[];
	supportedTokens: Token[] | undefined;
}): NetworkId[] | undefined => {
	const baseAllowedIds = SUPPORTED_CROSS_SWAP_NETWORKS[sourceToken.network.id];

	if (isNullish(supportedTokens)) {
		return baseAllowedIds;
	}

	const reachableIds = networksWithSupport({ networks, supportedTokens });

	if (isNullish(baseAllowedIds)) {
		return reachableIds;
	}

	const reachableSet = new Set(reachableIds);

	return baseAllowedIds.filter((id) => reachableSet.has(id));
};

export const getReceiveNetworkIds = ({
	sourceToken,
	supportedData,
	networks,
	tokens
}: {
	sourceToken: Token;
	supportedData: SwapSupportedTokensData | undefined;
	networks: Network[];
	tokens: TokenToggleable<Token>[];
}): NetworkId[] | undefined =>
	getReceiveNetworkIdsFromSupportedTokens({
		sourceToken,
		networks,
		supportedTokens: nonNullish(supportedData)
			? filterSwapTokens({ tokens, supportedData })
			: undefined
	});

/**
 * The tokens the receive list offers for a pay token on all networks and all asset types, with no
 * search: those the providers supporting the pay token reach, on the networks it reaches, the pay
 * token left out. The picker supplies networks already constrained when it opened. Previews
 * supply all swap networks so the constraints are computed from the current provider data.
 */
export const getReceiveSwapTokens = <T extends Token>({
	sourceToken,
	supportedData,
	networks,
	tokens,
	networksAreConstrained = false
}: {
	sourceToken: Token;
	supportedData: SwapSupportedTokensData | undefined;
	networks: Network[];
	tokens: TokenToggleable<T>[];
	networksAreConstrained?: boolean;
}): TokenToggleable<T>[] => {
	const supportedTokens = filterSwapTokens({ tokens, supportedData });
	const networkIds = networksAreConstrained
		? undefined
		: getReceiveNetworkIdsFromSupportedTokens({
				sourceToken,
				networks,
				supportedTokens: nonNullish(supportedData) ? supportedTokens : undefined
			});

	// Only swap networks; among them, the ones the pay token reaches. No network, like no constraint,
	// leaves every swap network, as the networks list reads it.
	const allowedNetworkIds = new Set(networkIds);
	const swapNetworkIds = new Set(networks.map(({ id }) => id));

	return supportedTokens.filter(
		({ id, network }) =>
			id !== sourceToken.id &&
			swapNetworkIds.has(network.id) &&
			(allowedNetworkIds.size === 0 || allowedNetworkIds.has(network.id))
	);
};

/**
 * The order of a swap token list: the active tokens as the token lists sort them, then the inactive
 * ones by symbol, since their row shows no balance and a balance must not move them up.
 */
export const sortSwapListTokens = <T extends Token>({
	tokens,
	$tokensToPin,
	$networksToPin
}: {
	tokens: TokenUi<T>[];
	$tokensToPin: ReadonlyArray<TokenToPin>;
	$networksToPin: ReadonlyArray<Pick<Network, 'id'>>;
}): TokenUi<T>[] => {
	const isActive = (token: TokenUi<T>): boolean => !isTokenToggleable(token) || token.enabled;

	return [
		...sortTokens({ $tokens: tokens.filter(isActive), $tokensToPin, $networksToPin }),
		...sortTokens({
			$tokens: tokens.filter((token) => !isActive(token)),
			$tokensToPin,
			$networksToPin,
			primarySortStrategy: 'symbol'
		})
	];
};

export interface SwapReceiveShortcuts<T extends Token = Token> {
	// The tokens on the pay token's network, in the order given.
	sameNetwork?: { network: Network; tokens: T[] };
	// The pay token's group on other networks, in chain order: the same asset, moved.
	otherNetwork?: { group: TokenGroupData; tokens: T[] };
	// Every token, when the two above leave some out.
	anyToken?: { tokens: number; networks: number };
}

/**
 * The shortcuts on the swap form for what to receive, as views of the receive list: `tokens` is what
 * the list offers for the pay token (`getReceiveSwapTokens`), in the list's order, and `networks` is
 * in chain order. A shortcut with nothing behind it is left out.
 */
export const getReceiveShortcuts = <T extends Token>({
	sourceToken,
	tokens,
	networks
}: {
	sourceToken: Token;
	tokens: T[];
	networks: Pick<Network, 'id'>[];
}): SwapReceiveShortcuts<T> => {
	const { network: sourceNetwork, groupData } = sourceToken;

	const sameNetworkTokens = tokens.filter(({ network }) => network.id === sourceNetwork.id);

	// A network chain order does not know goes last; the sort is stable, so the list's order stays
	// within a network.
	const chainIndex = ({ network }: T): number => {
		const index = networks.findIndex(({ id }) => id === network.id);

		return index < 0 ? networks.length : index;
	};

	const otherNetworkTokens = isNullish(groupData)
		? []
		: tokens
				.filter(
					(token) => token.groupData?.id === groupData.id && token.network.id !== sourceNetwork.id
				)
				.sort((a, b) => chainIndex(a) - chainIndex(b));

	// The two above never share a token: one keeps to the pay token's network, the other leaves it.
	const covered = sameNetworkTokens.length + otherNetworkTokens.length;

	return {
		...(sameNetworkTokens.length > 0 && {
			sameNetwork: { network: sourceNetwork, tokens: sameNetworkTokens }
		}),
		...(nonNullish(groupData) &&
			otherNetworkTokens.length > 0 && {
				otherNetwork: { group: groupData, tokens: otherNetworkTokens }
			}),
		...(tokens.length > covered && {
			anyToken: {
				tokens: tokens.length,
				networks: new Set(tokens.map(({ network }) => network.id)).size
			}
		})
	};
};

// Move lists the pay token's group on other networks.
export const getSwapMoveTokenSymbol = (sourceToken: Token | undefined): string | undefined =>
	sourceToken?.groupData?.symbol ?? sourceToken?.symbol;

export const getSwapMoveTokenTitle = ({
	i18n,
	sourceToken
}: {
	i18n: I18n;
	sourceToken: Token | undefined;
}): string =>
	replacePlaceholders(i18n.swap.text.move_token_to, {
		$symbol: getSwapMoveTokenSymbol(sourceToken) ?? ''
	});

/**
 * What the receive list shows for a pay token on all networks: its set (`getReceiveSwapTokens`)
 * without what that view leaves out, the testnet tokens. The shortcuts preview this.
 */
export const getListedReceiveTokens = <T extends Token>(
	params: Parameters<typeof getReceiveSwapTokens<T>>[0]
): TokenToggleable<T>[] =>
	filterTokensForSelectedNetwork([getReceiveSwapTokens(params), undefined, true]);

/**
 * The receive shortcuts for a pay token, with the tokens behind them as the receive list shows them on
 * all networks: in its order and with balances. `undefined` until the providers have answered, when
 * the set is still every token.
 */
export const getListedReceiveShortcuts = ({
	sourceToken,
	supportedData,
	swapNetworks,
	chainNetworks,
	tokens,
	$balances,
	$stakeBalances,
	$exchanges,
	$tokensToPin
}: {
	sourceToken: Token;
	supportedData: SwapSupportedTokensData | undefined;
	swapNetworks: Network[];
	// In chain order.
	chainNetworks: Network[];
	tokens: TokenToggleable<Token>[];
	$balances: CertifiedStoreData<BalancesData>;
	$stakeBalances: StakeBalances;
	$exchanges: ExchangesData;
	$tokensToPin: ReadonlyArray<TokenToPin>;
}): { tokens: TokenUi[]; shortcuts: SwapReceiveShortcuts<TokenUi> } | undefined => {
	if (isNullish(supportedData)) {
		return;
	}

	const listed = sortSwapListTokens({
		tokens: getListedReceiveTokens({
			sourceToken,
			supportedData,
			networks: swapNetworks,
			tokens
		}).map((token) => mapTokenUi({ token, $balances, $stakeBalances, $exchanges })),
		$tokensToPin,
		$networksToPin: chainNetworks
	});

	return {
		tokens: listed,
		shortcuts: getReceiveShortcuts({ sourceToken, tokens: listed, networks: chainNetworks })
	};
};

/**
 * The second line of each receive shortcut: up to three of the tokens on the pay token's network, up
 * to two of the other networks (or the one network and the name the token goes by there), and the
 * count of everything. A list cut short ends in "N more".
 */
export const getReceiveShortcutDetails = ({
	shortcuts: { sameNetwork, otherNetwork, anyToken },
	i18n,
	language,
	sourceToken,
	otherNetworkProviders = []
}: {
	shortcuts: SwapReceiveShortcuts;
	i18n: I18n;
	language: Languages;
	sourceToken: Token;
	// The providers that list the one token "<symbol> on another network" reaches, when it reaches one.
	otherNetworkProviders?: SwapProvider[];
}): { sameNetwork?: string; otherNetwork?: string; anyToken?: string } => {
	const preview = ({ items, max }: { items: string[]; max: number }): string =>
		formatList({
			items:
				items.length <= max
					? items
					: [
							...items.slice(0, max),
							replacePlaceholders(i18n.swap.text.receive_shortcut_more, {
								$count: `${items.length - max}`
							})
						],
			language
		});

	const otherNetworkDetail = (): string | undefined => {
		if (isNullish(otherNetwork)) {
			return;
		}

		const {
			tokens: [first, ...rest]
		} = otherNetwork;

		// The one token there: what taking it does, by the route behind it.
		if (rest.length === 0) {
			const symbol = getTokenDisplaySymbol(first);
			const network = first.network.name;

			if (otherNetworkProviders.includes(SwapProvider.CHAIN_FUSION)) {
				// From a ck token, its twin is where it came from.
				return replacePlaceholders(
					isIcToken(sourceToken)
						? i18n.swap.text.receive_shortcut_convert_back
						: i18n.swap.text.receive_shortcut_convert,
					{ $from: getTokenDisplaySymbol(sourceToken), $to: symbol }
				);
			}

			return replacePlaceholders(
				otherNetworkProviders.includes(SwapProvider.ONE_SEC)
					? i18n.swap.text.receive_shortcut_bridge_back
					: i18n.swap.text.receive_shortcut_move,
				{ $symbol: symbol, $network: network }
			);
		}

		// One name per network, should a group ever have two tokens on one.
		const names = otherNetwork.tokens.map(({ network: { name } }) => name);

		return preview({ items: names.filter((name, index) => names.indexOf(name) === index), max: 2 });
	};

	const anyTokenDetail = (): string | undefined => {
		if (isNullish(anyToken)) {
			return;
		}

		if (anyToken.tokens === 1) {
			return i18n.swap.text.receive_shortcut_any_token_count_single;
		}

		return replacePlaceholders(
			anyToken.networks === 1
				? i18n.swap.text.receive_shortcut_any_token_count_one
				: i18n.swap.text.receive_shortcut_any_token_count,
			{ $tokens: `${anyToken.tokens}`, $networks: `${anyToken.networks}` }
		);
	};

	return {
		...(nonNullish(sameNetwork) && {
			sameNetwork: preview({ items: sameNetwork.tokens.map(getTokenDisplaySymbol), max: 3 })
		}),
		...(nonNullish(otherNetwork) && { otherNetwork: otherNetworkDetail() }),
		...(nonNullish(anyToken) && { anyToken: anyTokenDetail() })
	};
};
