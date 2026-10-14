import {
	LIFI_ALLOWED_BRIDGES,
	LIFI_DENY_BRIDGES,
	LIFI_DENY_EXCHANGES,
	LIFI_DIAMOND_ADDRESSES
} from '$env/rest/lifi.env';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { ZERO, ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import { LifiQuoteRejectedError } from '$lib/types/errors';
import type { Network, NetworkId } from '$lib/types/network';
import {
	SwapProvider,
	type EvmQuoteParams,
	type NearIntentsQuoteParams,
	type SwapMappedResult
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { isNetworkEthereum, isNetworkIdSOLMainnet } from '$lib/utils/network.utils';
import { SYSTEM_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { isTokenSolanaNative } from '$sol/utils/token.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { ChainId, type LiFiStep, type QuoteRequestFromAmount } from '@lifi/sdk';

/**
 * LI.FI's chain id for a network it may be asked about: an EVM network whose Diamond is pinned, or
 * Solana mainnet. Anything else — another EVM chain, a testnet, a devnet — gets no quote.
 */
export const toLifiChainId = (network: Network): number | undefined => {
	if (isNetworkEthereum(network)) {
		return nonNullish(LIFI_DIAMOND_ADDRESSES[network.id]) ? Number(network.chainId) : undefined;
	}

	return isNetworkIdSOLMainnet(network.id) ? ChainId.SOL : undefined;
};

/**
 * LI.FI's address for a token: the contract or mint address, the zero address for an EVM chain's
 * native coin, and the System Program id for native SOL.
 */
export const toLifiTokenAddress = (token: Token): string | undefined => {
	if (isTokenErc20(token) || isTokenErc4626(token) || isTokenSpl(token)) {
		return token.address;
	}

	if (isDefaultEthereumToken(token)) {
		return ZERO_ETH_ADDRESS;
	}

	return isTokenSolanaNative(token) ? SYSTEM_PROGRAM_ADDRESS : undefined;
};

/**
 * The quote request for a swap form's inputs, or `undefined` when LI.FI is not asked: an unsupported
 * network or token on either side, no user address, or an unusable slippage.
 *
 * Only EVM sources are quoted for now: a Solana source would need the Solana swap wizard to execute a
 * LI.FI transaction, which it cannot yet.
 */
export const buildLifiQuoteRequest = ({
	sourceToken,
	destinationToken,
	amount,
	userAddress,
	recipientAddress,
	slippage
}: EvmQuoteParams | NearIntentsQuoteParams): QuoteRequestFromAmount | undefined => {
	if (isNullish(userAddress) || !isNetworkEthereum(sourceToken.network)) {
		return;
	}

	const fromChain = toLifiChainId(sourceToken.network);
	const toChain = toLifiChainId(destinationToken.network);
	const fromToken = toLifiTokenAddress(sourceToken);
	const toToken = toLifiTokenAddress(destinationToken);

	// The source-chain address only stands in for a recipient on another EVM chain: a Solana
	// destination pays out to the user's Solana address or not at all.
	const toAddress =
		recipientAddress ?? (isNetworkEthereum(destinationToken.network) ? userAddress : undefined);

	// OISY's slippage is a percentage, LI.FI's a fraction.
	const lifiSlippage = Number(slippage) / 100;

	if (
		isNullish(fromChain) ||
		isNullish(toChain) ||
		isNullish(fromToken) ||
		isNullish(toToken) ||
		isNullish(toAddress) ||
		!(lifiSlippage > 0 && lifiSlippage < 1)
	) {
		return;
	}

	return {
		fromChain,
		toChain,
		fromToken,
		toToken,
		fromAddress: userAddress,
		toAddress,
		fromAmount: `${amount}`,
		slippage: lifiSlippage,
		order: 'CHEAPEST',
		// A displayed quote is never signed. Simulating it would drop every ERC-20 route whose
		// allowance does not exist yet; the quote that is signed is re-requested with simulation on.
		skipSimulation: true,
		// A destination call can forward the received funds anywhere, so no route may carry one.
		allowDestinationCall: false,
		allowBridges: LIFI_ALLOWED_BRIDGES[sourceToken.network.id],
		...(LIFI_DENY_BRIDGES.length > 0 && { denyBridges: LIFI_DENY_BRIDGES }),
		...(LIFI_DENY_EXCHANGES.length > 0 && { denyExchanges: LIFI_DENY_EXCHANGES })
	};
};

// LI.FI writes amounts as decimal strings and transaction values as hex. Anything else is refused
// rather than coerced: `BigInt('')` would read as zero.
const parseAmount = (value: string | undefined): bigint | undefined =>
	nonNullish(value) && /^(\d+|0x[\da-fA-F]+)$/.test(value) ? BigInt(value) : undefined;

// EVM hex is case-insensitive, and LI.FI may answer checksummed or lower-case whatever was sent;
// Solana's base58 is case-sensitive.
const isSameAddress = ({
	chainId,
	actual,
	expected
}: {
	chainId: number;
	actual: string | undefined;
	expected: string;
}): boolean =>
	nonNullish(actual) &&
	(chainId === ChainId.SOL ? actual === expected : actual.toLowerCase() === expected.toLowerCase());

const rejected = (reason: string): LifiQuoteRejectedError =>
	new LifiQuoteRejectedError(`LI.FI quote rejected: ${reason}`);

/**
 * Refuses a LI.FI quote that OISY did not ask for. Quotes are unsigned, so a compromised or
 * intercepted response could name any call target or spender; every quote, shown or executed, must
 * be addressed to the Diamond pinned for its source network, and must echo the request it answers.
 *
 * This binds where the transaction goes, not what its calldata does: the quote that is signed is
 * additionally checked against the Diamond's own calldata decoder before signing.
 */
export const assertLifiQuote = ({
	quote,
	request,
	sourceNetworkId
}: {
	quote: LiFiStep;
	request: QuoteRequestFromAmount;
	sourceNetworkId: NetworkId;
}) => {
	const { action, estimate, transactionRequest } = quote;
	const { fromChain, toChain, fromToken, toToken, fromAddress, toAddress, fromAmount } = request;

	const fromChainId = Number(fromChain);
	const toChainId = Number(toChain);
	const amount = parseAmount(fromAmount);
	const diamond = LIFI_DIAMOND_ADDRESSES[sourceNetworkId];

	if (isNullish(amount) || isNullish(diamond) || isNullish(toAddress)) {
		throw rejected('the request has no pinned Diamond, amount or recipient');
	}

	if (action.fromChainId !== fromChainId || action.toChainId !== toChainId) {
		throw rejected('chains differ from the request');
	}

	if (
		!isSameAddress({
			chainId: fromChainId,
			actual: action.fromToken.address,
			expected: fromToken
		}) ||
		!isSameAddress({ chainId: toChainId, actual: action.toToken.address, expected: toToken })
	) {
		throw rejected('tokens differ from the request');
	}

	if (parseAmount(action.fromAmount) !== amount) {
		throw rejected('amount differs from the request');
	}

	if (!isSameAddress({ chainId: toChainId, actual: action.toAddress, expected: toAddress })) {
		throw rejected('recipient differs from the request');
	}

	const toAmount = parseAmount(estimate.toAmount);
	const toAmountMin = parseAmount(estimate.toAmountMin);

	if (
		isNullish(toAmount) ||
		isNullish(toAmountMin) ||
		toAmountMin <= ZERO ||
		toAmountMin > toAmount
	) {
		throw rejected('invalid estimate');
	}

	if (isNullish(transactionRequest)) {
		throw rejected('no transaction');
	}

	const { to, from, chainId, data, value } = transactionRequest;

	if (
		!isSameAddress({ chainId: fromChainId, actual: to, expected: diamond }) ||
		!isSameAddress({ chainId: fromChainId, actual: estimate.approvalAddress, expected: diamond })
	) {
		throw rejected('target or spender is not the pinned Diamond');
	}

	if (chainId !== fromChainId) {
		throw rejected('transaction chain differs from the request');
	}

	if (!isSameAddress({ chainId: fromChainId, actual: from, expected: fromAddress })) {
		throw rejected('sender differs from the request');
	}

	if (isNullish(data) || data.length <= 2) {
		throw rejected('no calldata');
	}

	// A native source travels as the transaction's value; an ERC-20 source is pulled through the
	// allowance, so the transaction carries none.
	const expectedValue = fromToken === ZERO_ETH_ADDRESS ? amount : ZERO;

	if (parseAmount(value ?? '0x0') !== expectedValue) {
		throw rejected('value differs from the request');
	}
};

export const mapLifiSwapResult = (quote: LiFiStep): SwapMappedResult => ({
	provider: SwapProvider.LIFI,
	receiveAmount: BigInt(quote.estimate.toAmount),
	receiveOutMinimum: BigInt(quote.estimate.toAmountMin),
	swapDetails: quote
});
