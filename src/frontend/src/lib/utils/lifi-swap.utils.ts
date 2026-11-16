import {
	LIFI_BTC_FEE_ADDRESS,
	LIFI_BTC_FEE_COST_NAME,
	LIFI_BTC_MAX_MEMO_SCRIPT_BYTES,
	LIFI_BTC_MIN_AMOUNT_SATOSHIS,
	LIFI_BTC_MIN_FEE_SATOSHIS,
	LIFI_BTC_TOKEN_ADDRESS
} from '$btc/constants/lifi.constants';
import { btcAddressToOutputScript } from '$btc/utils/btc-psbt.utils';
import { isBitcoinToken } from '$btc/utils/token.utils';
import { BTC_SEND_VIA_BACKEND_ENABLED } from '$env/btc.env';
import {
	LIFI_ALLOWED_BRIDGES,
	LIFI_BTC_SWAP_ENABLED,
	LIFI_DENY_BRIDGES,
	LIFI_DENY_EXCHANGES,
	LIFI_DIAMOND_ADDRESSES,
	LIFI_SOLANA_ALLOWED_EXCHANGES
} from '$env/rest/lifi.env';
import { LIFI_ACROSS_WRAPPED_NATIVE, LIFI_FEE_BPS } from '$eth/constants/lifi.constants';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { ZERO, ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import { LifiQuoteRejectedError } from '$lib/types/errors';
import type { LifiBtcOutput, LifiBtcOutputs, LifiTokenRef } from '$lib/types/lifi';
import type { Network, NetworkId } from '$lib/types/network';
import {
	SwapProvider,
	type EvmQuoteParams,
	type GetSupportedDestinationsFn,
	type NearIntentsQuoteParams,
	type SwapMappedResult
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import {
	isNetworkEthereum,
	isNetworkIdBTCMainnet,
	isNetworkIdSOLMainnet
} from '$lib/utils/network.utils';
import { SYSTEM_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { decodeTransactionMessage } from '$sol/utils/sol-transactions.utils';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { isTokenSolanaNative } from '$sol/utils/token.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { ChainId, type FeeCost, type LiFiStep, type QuoteRequestFromAmount } from '@lifi/sdk';
import {
	getCompiledTransactionMessageDecoder,
	type Transaction,
	type TransactionVersion
} from '@solana/kit';
import { opcodes, Psbt } from 'bitcoinjs-lib';

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
 * Whether LI.FI is asked about a swap from this token as a BTC source: native BTC on mainnet, while
 * `LIFI_BTC_SWAP_ENABLED` and `BTC_SEND_VIA_BACKEND_ENABLED` are both on. Bitcoin is never a LI.FI
 * destination, so `toLifiChainId` and `toLifiTokenAddress` leave it out.
 */
const isLifiBtcSource = (token: Token): boolean =>
	LIFI_BTC_SWAP_ENABLED &&
	BTC_SEND_VIA_BACKEND_ENABLED &&
	isNetworkIdBTCMainnet(token.network.id) &&
	isBitcoinToken(token);

/**
 * The `getSupportedDestinations` of a LI.FI registry entry. LI.FI keeps no token list — any token on
 * a chain it serves may have a route, and a pair without one simply gets no quote — so an entry
 * answers with a wildcard for the category it quotes into.
 *
 * The routing sends a pair to the Solana registry whenever either side is Solana, so the EVM entry
 * quotes EVM → EVM (`{ evm: 'any' }`) and the Solana entry EVM → Solana and Solana → Solana
 * (`{ sol: 'any' }`). A Solana source gets nothing from the EVM entry: Solana → EVM is not quoted.
 */
export const buildLifiSupportedDestinations =
	(registry: 'evm' | 'sol'): GetSupportedDestinationsFn =>
	({ sourceToken }) => {
		// The same tests the quote request applies, so no destination is offered for a source LI.FI
		// is never asked about.
		if (
			isNullish(toLifiChainId(sourceToken.network)) ||
			isNullish(toLifiTokenAddress(sourceToken))
		) {
			return;
		}

		if (registry === 'sol') {
			return { sol: 'any' };
		}

		return isNetworkEthereum(sourceToken.network) ? { evm: 'any' } : undefined;
	};

/**
 * The quote request for a swap form's inputs, or `undefined` when LI.FI is not asked: an unsupported
 * network or token on either side, no user address, an unusable slippage, or a Solana source with an
 * EVM destination, whose recipient cannot be verified yet.
 *
 * A Solana source is limited to `LIFI_SOLANA_ALLOWED_EXCHANGES`, the exchanges whose transactions
 * its binding can check.
 *
 * A BTC source (`isLifiBtcSource`) is quoted from the user's BTC address, toward the user's address
 * on the destination network, and only from `LIFI_BTC_MIN_AMOUNT_SATOSHIS`.
 */
export const buildLifiQuoteRequest = ({
	sourceToken,
	destinationToken,
	amount,
	userAddress,
	recipientAddress,
	slippage
}: EvmQuoteParams | NearIntentsQuoteParams): QuoteRequestFromAmount | undefined => {
	if (isNullish(userAddress)) {
		return;
	}

	const btcSource = isLifiBtcSource(sourceToken);

	const fromChain = btcSource ? ChainId.BTC : toLifiChainId(sourceToken.network);
	const toChain = toLifiChainId(destinationToken.network);
	const fromToken = btcSource ? LIFI_BTC_TOKEN_ADDRESS : toLifiTokenAddress(sourceToken);
	const toToken = toLifiTokenAddress(destinationToken);

	// An EVM address only stands in for a recipient on another EVM chain: a Solana destination pays
	// out to the user's Solana address or not at all, and a BTC address is never a recipient.
	const toAddress =
		recipientAddress ??
		(isNetworkEthereum(sourceToken.network) && isNetworkEthereum(destinationToken.network)
			? userAddress
			: undefined);

	// OISY's slippage is a percentage, LI.FI's a fraction.
	const lifiSlippage = Number(slippage) / 100;

	// A denied bridge is removed from the allow-list here rather than sent as `denyBridges`: how
	// LI.FI combines the two lists is not documented, and the deny list is an emergency lever.
	const allowBridges = (LIFI_ALLOWED_BRIDGES[sourceToken.network.id] ?? []).filter(
		(bridge) => !LIFI_DENY_BRIDGES.includes(bridge)
	);

	const solanaSource = fromChain === ChainId.SOL;

	// A denied exchange is removed from a Solana source's allow-list for the same reason.
	const allowExchanges = solanaSource
		? LIFI_SOLANA_ALLOWED_EXCHANGES.filter((exchange) => !LIFI_DENY_EXCHANGES.includes(exchange))
		: undefined;

	if (
		isNullish(fromChain) ||
		isNullish(toChain) ||
		isNullish(fromToken) ||
		isNullish(toToken) ||
		isNullish(toAddress) ||
		!(lifiSlippage > 0 && lifiSlippage < 1) ||
		// A cross-chain route needs a bridge whose receiver the swap can bind.
		(fromChain !== toChain && allowBridges.length === 0) ||
		// Solana → EVM is out of scope: nothing binds its EVM recipient yet.
		(solanaSource && toChain !== ChainId.SOL) ||
		allowExchanges?.length === 0 ||
		(btcSource && amount < LIFI_BTC_MIN_AMOUNT_SATOSHIS)
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
		// An empty list would serialise as an empty `allowBridges=`; a same-chain route needs no bridge.
		...(allowBridges.length > 0 && { allowBridges }),
		...(nonNullish(allowExchanges) && { allowExchanges }),
		...(isNullish(allowExchanges) &&
			LIFI_DENY_EXCHANGES.length > 0 && { denyExchanges: LIFI_DENY_EXCHANGES })
	};
};

// LI.FI writes amounts as decimal strings and transaction values as hex. Anything else is refused
// rather than coerced: `BigInt('')` would read as zero.
const parseAmount = (value: string | undefined): bigint | undefined =>
	nonNullish(value) && /^(\d+|0x[\da-fA-F]+)$/.test(value) ? BigInt(value) : undefined;

/**
 * Whether two EVM hex values are the same: addresses, or 32-byte words. EVM hex is
 * case-insensitive, and LI.FI may answer checksummed or lower-case whatever was sent. Shared by the
 * quote trust checks and the calldata binding, so that both compare alike.
 */
export const isSameHex = ({
	actual,
	expected
}: {
	actual: string | undefined;
	expected: string;
}): boolean => nonNullish(actual) && actual.toLowerCase() === expected.toLowerCase();

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
	chainId === ChainId.SOL
		? nonNullish(actual) && actual === expected
		: isSameHex({ actual, expected });

/**
 * The error a LI.FI check refuses with, its message naming what was refused: the quote (the trust
 * checks), its calldata (the EVM binding) or its transaction (the Solana binding).
 */
export const lifiRejectedError = ({
	subject,
	reason
}: {
	subject: 'quote' | 'calldata' | 'transaction';
	reason: string;
}): LifiQuoteRejectedError => new LifiQuoteRejectedError(`LI.FI ${subject} rejected: ${reason}`);

const rejected = (reason: string): LifiQuoteRejectedError =>
	lifiRejectedError({ subject: 'quote', reason });

/**
 * Decodes a LI.FI Solana transaction, refusing one OISY would not sign as it is: anything but one
 * base64 string (an array is a Jito bundle), a message other than version 0, whose fee is the one its
 * Compute Budget instructions set, or one that needs a signer other than the user, who is then also
 * its fee payer. Shared by the quote trust checks and the binding, so that both refuse alike.
 */
export const decodeLifiSolTransaction = ({
	data,
	userAddress
}: {
	data: unknown;
	userAddress: string;
}): Transaction => {
	if (typeof data !== 'string') {
		throw lifiRejectedError({ subject: 'transaction', reason: 'not a single transaction' });
	}

	let transaction: Transaction;
	let version: TransactionVersion;

	try {
		transaction = decodeTransactionMessage(data);
		({ version } = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes));
	} catch (_: unknown) {
		throw lifiRejectedError({ subject: 'transaction', reason: 'it does not decode' });
	}

	if (version !== 0) {
		throw lifiRejectedError({ subject: 'transaction', reason: 'not a version 0 transaction' });
	}

	// The fee payer is the first signer.
	const signers = Object.keys(transaction.signatures);

	if (signers.length !== 1 || signers[0] !== userAddress) {
		throw lifiRejectedError({
			subject: 'transaction',
			reason: 'the transaction needs a signer other than the user'
		});
	}

	return transaction;
};

// The script that pays a mainnet Bitcoin address, or `undefined` for anything else.
const toLifiBtcScript = (address: string | undefined): Uint8Array | undefined => {
	if (isNullish(address)) {
		return;
	}

	try {
		return btcAddressToOutputScript({ address, network: 'mainnet' });
	} catch (_: unknown) {
		// Not a mainnet Bitcoin address.
	}
};

const isSameBytes = ({ actual, expected }: { actual: Uint8Array; expected: Uint8Array }): boolean =>
	actual.length === expected.length && actual.every((byte, index) => byte === expected[index]);

const BTC_PUSHDATA_LENGTH_BYTES: Partial<Record<number, number>> = {
	[opcodes.OP_PUSHDATA1]: 1,
	[opcodes.OP_PUSHDATA2]: 2,
	[opcodes.OP_PUSHDATA4]: 4
};

// Whether `script` is data pushes only, read byte by byte as the backend's parser reads it: direct
// pushes and `OP_PUSHDATA1/2/4`, minimal or not. bitcoinjs-lib cannot stand in: `isPushOnly` also
// accepts `OP_1NEGATE` and `OP_1`…`OP_16`, which the backend refuses, and `decompile` turns an
// explicit one-byte push of 1–16 into those opcodes.
const isBtcDataPushesOnly = (script: Uint8Array): boolean => {
	let offset = 0;

	while (offset < script.length) {
		const opcode = script[offset];
		offset += 1;

		// A direct push (0x00–0x4b) carries its length in the opcode itself.
		const lengthBytes = opcode < opcodes.OP_PUSHDATA1 ? 0 : BTC_PUSHDATA_LENGTH_BYTES[opcode];

		if (isNullish(lengthBytes) || offset + lengthBytes > script.length) {
			return false;
		}

		const dataLength =
			lengthBytes === 0
				? opcode
				: script
						.subarray(offset, offset + lengthBytes)
						.reduceRight((length, byte) => length * 256 + byte, 0);

		offset += lengthBytes + dataLength;
	}

	return offset === script.length;
};

// `OP_RETURN` followed only by data pushes, within `LIFI_BTC_MAX_MEMO_SCRIPT_BYTES`: the memo the
// backend broadcasts, so at most 80 bytes of data.
const isLifiBtcMemo = (script: Uint8Array): boolean =>
	script.length <= LIFI_BTC_MAX_MEMO_SCRIPT_BYTES &&
	script[0] === opcodes.OP_RETURN &&
	isBtcDataPushesOnly(script.subarray(1));

// LI.FI's fee as its BTC quote lists it: one `LIFI_BTC_FEE_COST_NAME` cost, in BTC, taken out of the
// amount rather than charged on top.
const lifiBtcQuotedFee = (feeCosts: FeeCost[] | undefined): bigint | undefined => {
	const [fee, ...others] = (feeCosts ?? []).filter(({ name }) => name === LIFI_BTC_FEE_COST_NAME);

	if (
		isNullish(fee) ||
		others.length > 0 ||
		!fee.included ||
		fee.token.chainId !== ChainId.BTC ||
		fee.token.address !== LIFI_BTC_TOKEN_ADDRESS
	) {
		return;
	}

	return parseAmount(fee.amount);
};

type LifiBtcOutputRole = 'deposit' | 'memo' | 'change' | 'fee' | 'other';

// LI.FI's order, the change missing only where LI.FI dropped it.
const LIFI_BTC_OUTPUT_LAYOUTS = ['deposit,memo,change,fee', 'deposit,memo,fee'];

const rejectedBtcTransaction = (reason: string): LifiQuoteRejectedError =>
	lifiRejectedError({ subject: 'transaction', reason });

/**
 * Decodes the PSBT of a LI.FI quote from BTC and returns the outputs OISY keeps byte for byte, found
 * by their role, not their position. LI.FI's inputs are not read: OISY spends its own.
 *
 * Refuses the quote unless its outputs are, in this order:
 *
 * 1. one to the bridge's deposit address (`transactionRequest.to`), of `amount` less LI.FI's fee;
 * 2. one `OP_RETURN` of value 0 that the backend broadcasts: data pushes only, at most 80 bytes;
 * 3. at most one change, to the user's address;
 * 4. one to LI.FI's pinned fee address, of exactly the fee its quote lists, at most `LIFI_FEE_BPS`
 *    of `amount`.
 *
 * Outputs are compared by script: without an ECC library, bitcoinjs-lib cannot turn a P2TR script
 * into an address. Shared by the quote trust checks and the rebuild, so that both read alike.
 */
export const decodeLifiBtcTransaction = ({
	quote: {
		estimate: { feeCosts },
		transactionRequest
	},
	amount,
	userAddress
}: {
	quote: LiFiStep;
	amount: bigint;
	userAddress: string;
}): LifiBtcOutputs => {
	let outputs: LifiBtcOutput[];

	try {
		outputs = Psbt.fromHex(transactionRequest?.data ?? '').txOutputs.map(({ script, value }) => ({
			script: Uint8Array.from(script),
			value: BigInt(value)
		}));
	} catch (_: unknown) {
		throw rejectedBtcTransaction('it does not decode');
	}

	const depositScript = toLifiBtcScript(transactionRequest?.to);
	const userScript = toLifiBtcScript(userAddress);

	if (isNullish(depositScript) || isNullish(userScript)) {
		throw rejectedBtcTransaction('the deposit or the user address is not a Bitcoin address');
	}

	const feeScript = btcAddressToOutputScript({ address: LIFI_BTC_FEE_ADDRESS, network: 'mainnet' });

	// Each kept output is told apart by its script alone.
	if (
		isSameBytes({ actual: depositScript, expected: userScript }) ||
		isSameBytes({ actual: depositScript, expected: feeScript }) ||
		isSameBytes({ actual: userScript, expected: feeScript })
	) {
		throw rejectedBtcTransaction('the deposit, the user and LI.FI share an address');
	}

	const roleOf = ({ script }: LifiBtcOutput): LifiBtcOutputRole =>
		isSameBytes({ actual: script, expected: depositScript })
			? 'deposit'
			: script[0] === opcodes.OP_RETURN
				? 'memo'
				: isSameBytes({ actual: script, expected: userScript })
					? 'change'
					: isSameBytes({ actual: script, expected: feeScript })
						? 'fee'
						: 'other';

	const roles = outputs.map(roleOf);

	const [deposit, memo] = outputs;
	const fee = outputs.at(-1);

	if (
		!LIFI_BTC_OUTPUT_LAYOUTS.includes(roles.join(',')) ||
		isNullish(deposit) ||
		isNullish(memo) ||
		isNullish(fee)
	) {
		throw rejectedBtcTransaction(
			'its outputs are not the deposit, the memo, the change and the fee, in that order'
		);
	}

	if (memo.value !== ZERO || !isLifiBtcMemo(memo.script)) {
		throw rejectedBtcTransaction('the memo is not one the backend broadcasts');
	}

	const lifiFee = lifiBtcQuotedFee(feeCosts);

	if (isNullish(lifiFee) || fee.value !== lifiFee || lifiFee * 10_000n > amount * LIFI_FEE_BPS) {
		throw rejectedBtcTransaction("LI.FI's fee output is not its quoted fee of at most 25 bps");
	}

	// The fee output is kept byte for byte, so below the dust limit the signed transaction would not
	// broadcast.
	if (lifiFee < LIFI_BTC_MIN_FEE_SATOSHIS) {
		throw rejectedBtcTransaction("LI.FI's fee output is below the dust limit");
	}

	if (deposit.value !== amount - lifiFee) {
		throw rejectedBtcTransaction("the deposit is not the amount less LI.FI's fee");
	}

	return { deposit, memo, fee };
};

/**
 * Refuses a LI.FI quote that OISY did not ask for. Quotes are unsigned, so a compromised or
 * intercepted response could name any call target or spender; every quote, shown or executed, must
 * echo the request it answers. An EVM one must be addressed to the Diamond pinned for its source
 * network; a Solana one must be a version 0 transaction that only the user signs; a BTC one must pay
 * the deposit, LI.FI's memo and LI.FI's fee as `decodeLifiBtcTransaction` reads them, and nothing
 * else but the user's change.
 *
 * This binds where the transaction goes, not what it does: the quote that is signed is additionally
 * checked against the Diamond's own calldata decoder (EVM) or the pinned instructions (Solana).
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

	if (isNullish(amount) || isNullish(toAddress)) {
		throw rejected('the request has no amount or recipient');
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

	// The bridge and exchange lists are only request parameters. A route through a tool outside them
	// is refused here, so the lists still work if LI.FI ignores or misreads them.
	const { allowBridges = [], allowExchanges, denyExchanges = [] } = request;

	if (
		quote.includedSteps.some(
			({ type, tool }) =>
				(type === 'cross' && !allowBridges.includes(tool)) ||
				(type === 'swap' &&
					(denyExchanges.includes(tool) ||
						(nonNullish(allowExchanges) && !allowExchanges.includes(tool))))
		)
	) {
		throw rejected('route uses a bridge or exchange outside the requested lists');
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

	if (fromChainId === ChainId.SOL) {
		decodeLifiSolTransaction({ data, userAddress: fromAddress });
		return;
	}

	// The request checks above have confirmed the amount, so a quote cannot inflate its own to pass a
	// larger deposit.
	if (fromChainId === ChainId.BTC) {
		decodeLifiBtcTransaction({ quote, amount, userAddress: fromAddress });
		return;
	}

	const diamond = LIFI_DIAMOND_ADDRESSES[sourceNetworkId];

	if (isNullish(diamond)) {
		throw rejected('the request has no pinned Diamond');
	}

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
	// allowance, so the transaction carries none. A bridge that charges a native fee on top
	// (`feeCosts` with `included: false`) is refused too; none of the allowed bridges does.
	const expectedValue = fromToken === ZERO_ETH_ADDRESS ? amount : ZERO;

	if (parseAmount(value ?? '0x0') !== expectedValue) {
		throw rejected('value differs from the request');
	}
};

/**
 * The quote's fees in USD — LI.FI's own 0.25 % and whatever the route's tools charge — for display
 * only, as the fees already taken out of the receive amount. `undefined` when the quote lists none,
 * lists one without a readable USD amount (a partial sum would understate what the swap costs), or
 * lists one charged on top of the amount sent (`included: false`): added in, the total would match
 * neither what is deducted nor what is extra. The value trust check refuses the routes that charge a
 * native fee on top, so none is expected; a bridge admitted with one needs its own row.
 */
export const lifiFeesUsd = ({ estimate: { feeCosts } }: LiFiStep): number | undefined => {
	if (isNullish(feeCosts) || feeCosts.length === 0) {
		return;
	}

	if (feeCosts.some(({ included }) => !included)) {
		return;
	}

	// A plain decimal only: `Number` reads a blank string as zero, which would let a missing amount
	// pass as a free fee.
	if (!feeCosts.every(({ amountUSD }) => /^\d+(\.\d+)?$/.test(amountUSD))) {
		return;
	}

	return feeCosts.reduce((sum, { amountUSD }) => sum + Number(amountUSD), 0);
};

export const mapLifiSwapResult = ({
	quote,
	request,
	solFeeCeiling
}: {
	quote: LiFiStep;
	request: QuoteRequestFromAmount;
	solFeeCeiling?: bigint;
}): SwapMappedResult => ({
	provider: SwapProvider.LIFI,
	receiveAmount: BigInt(quote.estimate.toAmount),
	receiveOutMinimum: BigInt(quote.estimate.toAmountMin),
	swapDetails: quote,
	request,
	...(nonNullish(solFeeCeiling) && { solFeeCeiling })
});

const isSameLifiToken = ({
	actual,
	expected
}: {
	actual: LifiTokenRef;
	expected: LifiTokenRef;
}): boolean =>
	actual.chainId === expected.chainId &&
	isSameHex({ actual: actual.address, expected: expected.address });

/**
 * The one token a route between two EVM networks moves the funds through besides its source and
 * its destination — USDG, for a route that bridges USDC to Robinhood Chain and swaps it to NVDA
 * there: the token of the two separate swaps the user can make instead. `undefined` when there is
 * none or more than one. LI.FI's fee step keeps the token and does not count; every other step's
 * output does, wrapped coins included.
 *
 * Also `undefined` for a wrapped native coin on the destination side of the bridge: Across pays
 * those out unwrapped, so no swap could deliver one as the first of the two.
 */
export const findLifiIntermediateToken = ({
	action: { fromChainId, toChainId, fromToken, toToken },
	includedSteps
}: LiFiStep): LifiTokenRef | undefined => {
	if (
		fromChainId === toChainId ||
		fromChainId === ChainId.SOL ||
		toChainId === ChainId.SOL ||
		fromChainId === ChainId.BTC
	) {
		return;
	}

	const outputs = includedSteps
		.filter(
			({ action }) => !isSameLifiToken({ actual: action.toToken, expected: action.fromToken })
		)
		.map(({ action }) => action.toToken);

	const last = outputs.at(-1);

	if (isNullish(last) || !isSameLifiToken({ actual: last, expected: toToken })) {
		return;
	}

	const [intermediate, ...others] = outputs.filter(
		(token) =>
			!isSameLifiToken({ actual: token, expected: fromToken }) &&
			!isSameLifiToken({ actual: token, expected: toToken })
	);

	if (
		isNullish(intermediate) ||
		others.some((token) => !isSameLifiToken({ actual: token, expected: intermediate }))
	) {
		return;
	}

	const wrappedNative = LIFI_ACROSS_WRAPPED_NATIVE[toChainId];

	if (
		intermediate.chainId === toChainId &&
		nonNullish(wrappedNative) &&
		isSameHex({ actual: intermediate.address, expected: wrappedNative })
	) {
		return;
	}

	return { chainId: intermediate.chainId, address: intermediate.address };
};

/**
 * The token OISY lists, enabled or not, that LI.FI names: matched by its address within its
 * network, never by its symbol — two tokens on one network can share a symbol.
 */
export const findLifiListedToken = ({
	tokens,
	token
}: {
	tokens: Token[];
	token: LifiTokenRef;
}): Token | undefined =>
	tokens.find((candidate) => {
		const chainId = toLifiChainId(candidate.network);
		const address = toLifiTokenAddress(candidate);

		return (
			nonNullish(chainId) &&
			nonNullish(address) &&
			isSameLifiToken({ actual: { chainId, address }, expected: token })
		);
	});

/**
 * The addresses of every ERC-20 and ERC-4626 OISY knows on a network, enabled or not, whose
 * allowances to the Diamond the calldata binding reads: hiding a token does not revoke its
 * allowance. A token OISY does not know, approved through another dapp, cannot be listed; LI.FI's
 * whitelist remains the guard there.
 */
export const lifiUserTokenAddresses = ({
	tokens,
	networkId
}: {
	tokens: Token[];
	networkId: NetworkId;
}): string[] =>
	tokens.flatMap((token) =>
		token.network.id === networkId && (isTokenErc20(token) || isTokenErc4626(token))
			? [token.address]
			: []
	);
