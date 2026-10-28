import {
	LIFI_ACROSS_MAX_FILL_DEADLINE_SECONDS,
	LIFI_ACROSS_MULTIPLIER_BASE,
	LIFI_ACROSS_TOOL,
	LIFI_ACROSS_V4_ABI,
	LIFI_ACROSS_WRAPPED_NATIVE,
	LIFI_APPROVE_TO_ONLY_SELECTOR,
	LIFI_FEE_BPS,
	LIFI_FEE_FORWARDER_ABI,
	LIFI_GENERIC_SWAP_ABI,
	LIFI_NEAR_INTENTS_ABI,
	LIFI_NEAR_INTENTS_NATIVE_ASSET,
	LIFI_NON_EVM_ADDRESS
} from '$eth/constants/lifi.constants';
import type { EthAddress } from '$eth/types/address';
import { ZERO, ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import type { LifiQuoteRejectedError } from '$lib/types/errors';
import { isSameHex, lifiRejectedError } from '$lib/utils/lifi-swap.utils';
import { SYSTEM_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { isNullish, nonNullish } from '@dfinity/utils';
import { ChainId, type LiFiStep, type QuoteRequestFromAmount } from '@lifi/sdk';
import { getAddressEncoder, type Address } from '@solana/kit';
import { Interface, type Result } from 'ethers/abi';
import { hexlify, zeroPadValue } from 'ethers/utils';

// `ILiFi.BridgeData`, as far as the binding reads it.
interface LifiBridgeData {
	sendingAssetId: string;
	receiver: string;
	minAmount: bigint;
	destinationChainId: bigint;
	hasSourceSwaps: boolean;
	hasDestinationCall: boolean;
}

// `LibSwap.SwapData`
interface LifiSwapStep {
	callTo: string;
	approveTo: string;
	sendingAssetId: string;
	receivingAssetId: string;
	fromAmount: bigint;
	callData: string;
	requiresDeposit: boolean;
}

/**
 * A contract call one of the route's swaps makes through the Diamond, to be confirmed against the
 * Diamond's own whitelist (`isContractSelectorWhitelisted`) before signing.
 */
export interface LifiWhitelistedCall {
	contract: string;
	selector: string;
}

// The pinned functions: calldata is decoded only as a function of these ABIs, looked up by its
// selector, so a selector outside them is refused before anything is decoded.
const genericSwapFacet = new Interface(LIFI_GENERIC_SWAP_ABI);

const feeForwarder = new Interface(LIFI_FEE_FORWARDER_ABI);

const rejected = (reason: string): LifiQuoteRejectedError =>
	lifiRejectedError({ subject: 'calldata', reason });

const toBridgeData = (value: Result): LifiBridgeData => {
	const struct = value.toObject();

	return {
		sendingAssetId: struct.sendingAssetId,
		receiver: struct.receiver,
		minAmount: struct.minAmount,
		destinationChainId: struct.destinationChainId,
		hasSourceSwaps: struct.hasSourceSwaps,
		hasDestinationCall: struct.hasDestinationCall
	};
};

const toSwapStep = (value: Result): LifiSwapStep => {
	const struct = value.toObject();

	return {
		callTo: struct.callTo,
		approveTo: struct.approveTo,
		sendingAssetId: struct.sendingAssetId,
		receivingAssetId: struct.receivingAssetId,
		fromAmount: struct.fromAmount,
		callData: struct.callData,
		requiresDeposit: struct.requiresDeposit
	};
};

// The selector picks the function out of the pinned ABI first, and only then is the calldata decoded,
// as that function: its layout is known, never guessed. A selector outside the ABI has no layout to
// decode with, and is refused like calldata that is malformed for its function.
const parseCall = ({ facet, data }: { facet: Interface; data: string }) => {
	try {
		const call = facet.parseTransaction({ data });

		if (nonNullish(call)) {
			return call;
		}
	} catch (_: unknown) {
		// Malformed for the function its selector names.
	}

	throw rejected('the calldata does not call a pinned function, or does not decode as it');
};

const evmAddressToBytes32 = (address: string): string => zeroPadValue(address.toLowerCase(), 32);

const solanaAddressToBytes32 = (address: string): string => {
	try {
		return hexlify(Uint8Array.from(getAddressEncoder().encode(address as Address)));
	} catch (_: unknown) {
		throw rejected('a Solana address of the request is not one');
	}
};

/**
 * What a swap forwards as LI.FI's fee, or `undefined` if it does not call the fee forwarding. The
 * whitelist admits the forwarder by contract and selector only, while its arguments say who is paid
 * and how much of the deposit leaves: so the fee must be the source token, passed through untouched,
 * and its distributions are summed for the cap on LI.FI's fee.
 */
const forwardedFee = ({
	step: { callData, sendingAssetId, receivingAssetId },
	sourceToken
}: {
	step: LifiSwapStep;
	sourceToken: string;
}): bigint | undefined => {
	if (isNullish(feeForwarder.getFunction(callData.slice(0, 10)))) {
		return undefined;
	}

	const { name, args } = parseCall({ facet: feeForwarder, data: callData });
	const token = name === 'forwardERC20Fees' ? args[0] : ZERO_ETH_ADDRESS;

	if (
		![sendingAssetId, receivingAssetId, token].every((asset) =>
			isSameHex({ actual: asset, expected: sourceToken })
		)
	) {
		throw rejected("LI.FI's fee is not taken in the source token");
	}

	return (args.at(-1) as Result[]).reduce<bigint>(
		(total, [, amount]: Result) => total + (amount as bigint),
		ZERO
	);
};

/**
 * Binds every entry of a route's `SwapData[]`, not only the first. The Diamond pulls `fromAmount` of
 * `sendingAssetId` from the user for each entry with `requiresDeposit`, so only the first may
 * deposit, and exactly the source token and amount; LI.FI's own fee collection is that first entry.
 *
 * Each entry's call runs with the Diamond as `msg.sender`, so the only user funds it could reach are
 * the user's allowances to the Diamond: no call or approval may target the Diamond, an asset of the
 * route, or a token of the user with an allowance to the Diamond (`approvedTokenAddresses`). A token
 * without one cannot be spent that way, and some are DEX pools a route may call, so it is not
 * forbidden. What the calls do is left to LI.FI's on-chain whitelist, which
 * the returned calls are confirmed against before signing. An `approveTo` other than `callTo` is
 * looked up under `APPROVE_TO_ONLY_SELECTOR`, as `SwapperV2` does, except for a native sending
 * asset, which is not approved.
 *
 * The one call whose arguments are bound is LI.FI's fee forwarding: together, the route may forward
 * no more than LI.FI's fee. Where `dexSwaps` is `false`, it is the only call allowed.
 */
const bindSwapSteps = ({
	steps,
	sourceToken,
	amount,
	diamond,
	routeAssets,
	approvedTokenAddresses,
	dexSwaps
}: {
	steps: LifiSwapStep[];
	sourceToken: string;
	amount: bigint;
	diamond: EthAddress;
	routeAssets: string[];
	approvedTokenAddresses: string[];
	dexSwaps: boolean;
}): LifiWhitelistedCall[] => {
	const [deposit, ...later] = steps;

	if (
		isNullish(deposit) ||
		!deposit.requiresDeposit ||
		!isSameHex({ actual: deposit.sendingAssetId, expected: sourceToken }) ||
		deposit.fromAmount !== amount
	) {
		throw rejected('the first swap does not deposit exactly the amount of the source token');
	}

	if (later.some(({ requiresDeposit }) => requiresDeposit)) {
		throw rejected('a later swap would pull another deposit from the user');
	}

	const forbiddenTargets = new Set(
		[
			diamond,
			...routeAssets,
			...steps.flatMap(({ sendingAssetId, receivingAssetId }) => [
				sendingAssetId,
				receivingAssetId
			]),
			...approvedTokenAddresses
		].map((address) => address.toLowerCase())
	);

	const calls = new Map<string, LifiWhitelistedCall>();

	const addCall = (call: LifiWhitelistedCall) =>
		calls.set(`${call.contract.toLowerCase()}:${call.selector.toLowerCase()}`, call);

	let fees = ZERO;

	for (const step of steps) {
		const { callTo, approveTo, callData, sendingAssetId } = step;

		if (
			forbiddenTargets.has(callTo.toLowerCase()) ||
			forbiddenTargets.has(approveTo.toLowerCase())
		) {
			throw rejected(
				'a swap targets the Diamond, an asset of the route or a token the user approved to it'
			);
		}

		if (callData.length < 10) {
			throw rejected('a swap makes no call');
		}

		const fee = forwardedFee({ step, sourceToken });

		if (isNullish(fee) && !dexSwaps) {
			throw rejected('a DEX swap precedes a bridge that cannot bound its output');
		}

		fees += fee ?? ZERO;

		addCall({ contract: callTo, selector: callData.slice(0, 10) });

		if (
			!isSameHex({ actual: approveTo, expected: callTo }) &&
			!isSameHex({ actual: sendingAssetId, expected: ZERO_ETH_ADDRESS })
		) {
			addCall({ contract: approveTo, selector: LIFI_APPROVE_TO_ONLY_SELECTOR });
		}
	}

	// LI.FI rounds its fee down, so a single unit more is refused too.
	if (fees * 10_000n > amount * LIFI_FEE_BPS) {
		throw rejected("the fees forwarded exceed LI.FI's fee");
	}

	return [...calls.values()];
};

/**
 * Whether a `GenericSwapFacetV3` function takes a native input and pays a native output, as its name
 * says. The functions share one layout but not their behaviour: a `…ToNative` one pays out the
 * Diamond's whole native balance and checks the minimum against it, whatever the swaps produced.
 * Called for an ERC-20 destination, it would leave the user's swapped tokens in the Diamond and pay
 * them its native dust, should that reach the minimum in wei.
 */
const genericSwapModes = (name: string): { nativeIn: boolean; nativeOut: boolean } | undefined => {
	const [, input, output] = /V3(ERC20|Native)To(ERC20|Native)$/.exec(name) ?? [];

	return nonNullish(input) && nonNullish(output)
		? { nativeIn: input === 'Native', nativeOut: output === 'Native' }
		: undefined;
};

const isNativeToken = ({ token, toNonEvm }: { token: string; toNonEvm: boolean }): boolean =>
	toNonEvm
		? token === SYSTEM_PROGRAM_ADDRESS
		: isSameHex({ actual: token, expected: ZERO_ETH_ADDRESS });

// A token or address as a bridge's own data names it: 32 bytes, an EVM address left-padded, a Solana
// one as its key.
const toBytes32 = ({ address, toNonEvm }: { address: string; toNonEvm: boolean }): string =>
	toNonEvm ? solanaAddressToBytes32(address) : evmAddressToBytes32(address);

/**
 * What a bridge's own data commits it to, which is what the bridge consumes: `bridgeData` alone does
 * not say whom it pays, in which token, or at least how much. Addresses and assets as 32 bytes.
 */
interface LifiBridgeTerms {
	// The address the bridge pays, or `undefined` where it pays `bridgeData.receiver` instead.
	receiver?: string;
	refund: string;
	// The token the bridge sends, where its data names it apart from `bridgeData.sendingAssetId`.
	sendingAsset?: string;
	receivingAsset: string;
	minimumOutput: bigint;
	// Where the bridge's data sets them: the time its deposit may still be filled until, in seconds,
	// after which an unfilled deposit is refunded, and whether one relayer alone may fill it for a
	// while. A response may otherwise choose how long the user's funds wait.
	fillDeadline?: bigint;
	exclusiveFill?: boolean;
}

interface LifiBridge {
	facet: Interface;
	// Whether a DEX swap may precede the bridge, rather than LI.FI's fee forwarding alone.
	dexSwaps: boolean;
	terms: (params: {
		facetData: Result;
		bridgeData: LifiBridgeData;
		withSourceSwaps: boolean;
		toNonEvm: boolean;
	}) => LifiBridgeTerms;
	// The requested token as the bridge's data names it, or `undefined` if the bridge cannot pay it.
	receivingAsset: (params: {
		toToken: string;
		toChain: number;
		toNonEvm: boolean;
	}) => string | undefined;
}

// The curated bridges, by LI.FI tool key. A bridge the request allows but which has no entry here is
// refused: what it pays, and to whom, could not be bound.
const bridges: Record<string, LifiBridge> = {
	[LIFI_ACROSS_TOOL]: {
		facet: new Interface(LIFI_ACROSS_V4_ABI),
		// Across's minimum output is unsigned: after source swaps, the facet pays at least `minAmount`
		// times `outputAmountMultiplier`, both from the response. A DEX swap's recipient is in calldata
		// the binding does not decode, so a response could send the swap's output elsewhere, lower
		// `minAmount` to what is left and raise the multiplier to keep the product above the displayed
		// minimum: no relayer would fill it, and only what is left would be refunded. Behind LI.FI's fee
		// forwarding alone, the bridge sends the deposit less the bound fee, and a wrong multiplier can
		// at worst leave it unfilled and refunded to the user once its fill deadline passes.
		dexSwaps: false,
		terms: ({ facetData, bridgeData, withSourceSwaps }) => {
			const {
				receiverAddress,
				refundAddress,
				sendingAssetId,
				receivingAssetId,
				outputAmount,
				outputAmountMultiplier,
				exclusiveRelayer,
				fillDeadline,
				exclusivityParameter
			} = facetData.toObject();

			return {
				receiver: receiverAddress,
				refund: refundAddress,
				// A native token is sent as the facet's own wrapped native, whatever this says.
				sendingAsset: isSameHex({ actual: bridgeData.sendingAssetId, expected: ZERO_ETH_ADDRESS })
					? undefined
					: sendingAssetId,
				receivingAsset: receivingAssetId,
				// After source swaps, the facet replaces `outputAmount` with what the swaps produce times
				// the multiplier, and `SwapperV2` reverts unless they produce at least `minAmount`.
				minimumOutput: withSourceSwaps
					? (bridgeData.minAmount * outputAmountMultiplier) / LIFI_ACROSS_MULTIPLIER_BASE
					: outputAmount,
				fillDeadline: BigInt(fillDeadline),
				// The SpokePool reserves the fill to `exclusiveRelayer` only when it names one and the
				// exclusivity parameter is non-zero.
				exclusiveFill: BigInt(exclusiveRelayer) !== ZERO && BigInt(exclusivityParameter) !== ZERO
			};
		},
		// On an EVM chain, the SpokePool unwraps its wrapped native for a wallet recipient whatever was
		// asked for: a native coin is paid out as that token, and that token can never be paid out as
		// itself. A chain without it pinned gets nothing, and there is no such token for native SOL.
		receivingAsset: ({ toToken, toChain, toNonEvm }) => {
			const isNative = isNativeToken({ token: toToken, toNonEvm });

			if (toNonEvm) {
				return isNative ? undefined : solanaAddressToBytes32(toToken);
			}

			const wrappedNative = LIFI_ACROSS_WRAPPED_NATIVE[toChain];

			if (isNullish(wrappedNative) || isSameHex({ actual: toToken, expected: wrappedNative })) {
				return undefined;
			}

			return evmAddressToBytes32(isNative ? wrappedNative : toToken);
		}
	},
	near: {
		facet: new Interface(LIFI_NEAR_INTENTS_ABI),
		// LI.FI's backend signs `minAmountOut` together with `minAmount`, so a payload paying at least
		// the displayed minimum carries the `minAmount` LI.FI priced for it, and `SwapperV2` reverts
		// unless the swaps before the bridge produce that much.
		dexSwaps: true,
		terms: ({ facetData, toNonEvm }) => {
			const { nonEVMReceiver, refundRecipient, destinationAsset, minAmountOut } =
				facetData.toObject();

			return {
				// For an EVM destination the facet signs over `bridgeData.receiver` and does not read this.
				receiver: toNonEvm ? nonEVMReceiver : undefined,
				// Leftovers and refunds.
				refund: evmAddressToBytes32(refundRecipient),
				receivingAsset: destinationAsset,
				minimumOutput: minAmountOut
			};
		},
		receivingAsset: ({ toToken, toNonEvm }) =>
			isNativeToken({ token: toToken, toNonEvm })
				? evmAddressToBytes32(LIFI_NEAR_INTENTS_NATIVE_ASSET)
				: toBytes32({ address: toToken, toNonEvm })
	}
};

// The table's own entries only: a route's tool key comes from LI.FI's response.
const bridgeOf = (tool: string | undefined): LifiBridge | undefined =>
	nonNullish(tool) && Object.hasOwn(bridges, tool) ? bridges[tool] : undefined;

// The call the calldata makes, decoded with the pinned ABI its selector names: same-chain,
// `GenericSwapFacetV3`'s, and cross-chain, that of a bridge the request allowed. With the swap steps
// it carries, each one a call the Diamond makes.
const decodeLifiCall = ({
	data,
	request: { fromChain, toChain, allowBridges }
}: {
	data: string;
	request: QuoteRequestFromAmount;
}): { name: string; args: Result; steps: LifiSwapStep[]; bridge?: LifiBridge } => {
	if (Number(fromChain) === Number(toChain)) {
		const { name, args } = parseCall({ facet: genericSwapFacet, data });
		const [, , , , , swapData] = args;

		return {
			name,
			args,
			steps: name.startsWith('swapTokensSingle')
				? [toSwapStep(swapData)]
				: (swapData as Result[]).map(toSwapStep)
		};
	}

	const selector = data.slice(0, 10).toLowerCase();
	const bridge = bridgeOf(
		allowBridges?.find((key) => nonNullish(bridgeOf(key)?.facet.getFunction(selector)))
	);

	if (isNullish(bridge)) {
		throw rejected('a cross-chain route calls a function of no bridge the request allowed');
	}

	const { name, args } = parseCall({ facet: bridge.facet, data });

	return {
		name,
		args,
		steps: name.startsWith('swapAndStart') ? (args[1] as Result[]).map(toSwapStep) : [],
		bridge
	};
};

/**
 * Every address a swap step of the calldata calls or approves: of the user's tokens, the only ones
 * whose allowance to the Diamond `assertLifiCalldata` can be refused for. Calldata that does not
 * decode has none, and the binding refuses it.
 */
export const lifiCalldataSwapTargets = ({
	quote,
	request
}: {
	quote: LiFiStep;
	request: QuoteRequestFromAmount;
}): string[] => {
	const data = quote.transactionRequest?.data;

	if (isNullish(data)) {
		return [];
	}

	try {
		return decodeLifiCall({ data, request }).steps.flatMap(({ callTo, approveTo }) => [
			callTo,
			approveTo
		]);
	} catch (_: unknown) {
		return [];
	}
};

/**
 * Whether the calldata binding could accept the route, judged from its steps: no step after the
 * bridge, which would pay out another token than the one asked for, and a bridge the binding knows,
 * after a DEX swap only if it can bound the swap's output (`dexSwaps`). A route that fails is not
 * offered, so the form never shows what execution would refuse.
 */
export const isLifiRouteExecutable = ({ includedSteps }: LiFiStep): boolean => {
	const bridgeIndex = includedSteps.findIndex(({ type }) => type === 'cross');

	if (bridgeIndex === -1) {
		return true;
	}

	const bridge = bridgeOf(includedSteps[bridgeIndex]?.tool);
	const swapsBefore = includedSteps.slice(0, bridgeIndex).some(({ type }) => type === 'swap');

	return (
		nonNullish(bridge) &&
		bridgeIndex === includedSteps.length - 1 &&
		(bridge.dexSwaps || !swapsBefore)
	);
};

/**
 * Binds an EVM LI.FI transaction's calldata to the request, by decoding it with the pinned ABI of the
 * function its selector names. LI.FI quotes are unsigned, and `assertLifiQuote` only binds where the
 * transaction goes; this binds what it does. Run on the execution-time quote, the one whose bytes
 * are signed. Refuses with `LifiQuoteRejectedError`.
 *
 * Same-chain, the selector must be one of `GenericSwapFacetV3`'s swap functions: the swap pays the
 * user at least `displayedToAmountMin` of the destination token. Cross-chain, it must be a function
 * of a bridge the request allowed (`allowBridges`, the same keys the display quote was limited to):
 * no destination call, the requested destination chain, the source token and amount
 * as input, and the user as receiver and refund address both in `bridgeData` and in the bridge's
 * own data (a Solana destination's receiver as its 32-byte key, behind LI.FI's non-EVM sentinel).
 * The bridge's own data must also send the bridged token and pay out the destination token, at
 * least `displayedToAmountMin` of it, and where it sets a fill deadline and exclusivity, leave the
 * fill to any relayer and the refund of an unfilled deposit no later than LI.FI sets it.
 *
 * On every route, LI.FI's fee forwarding may forward no more than LI.FI's fee. Before Across, it is
 * the only swap allowed.
 *
 * Returns the swap calls that the Diamond's whitelist must still confirm.
 */
export const assertLifiCalldata = ({
	quote,
	request,
	diamond,
	displayedToAmountMin,
	approvedTokenAddresses,
	nowSeconds
}: {
	quote: LiFiStep;
	request: QuoteRequestFromAmount;
	diamond: EthAddress;
	displayedToAmountMin: bigint;
	approvedTokenAddresses: string[];
	// The current time, which a bridge's fill deadline is measured from.
	nowSeconds: bigint;
}): LifiWhitelistedCall[] => {
	const data = quote.transactionRequest?.data;
	const { toChain, fromToken, toToken, fromAddress, toAddress, fromAmount } = request;

	if (isNullish(data) || !/^0x[\da-fA-F]{8,}$/.test(data)) {
		throw rejected('no calldata');
	}

	if (isNullish(toAddress)) {
		throw rejected('the request has no recipient');
	}

	const amount = BigInt(fromAmount);

	const { name, args, steps, bridge } = decodeLifiCall({ data, request });

	if (isNullish(bridge)) {
		const [, , , receiver, minAmountOut] = args;

		const modes = genericSwapModes(name);

		if (
			isNullish(modes) ||
			modes.nativeIn !== isSameHex({ actual: fromToken, expected: ZERO_ETH_ADDRESS }) ||
			modes.nativeOut !== isSameHex({ actual: toToken, expected: ZERO_ETH_ADDRESS })
		) {
			throw rejected("the swap function's native input or output differs from the request");
		}

		if (!isSameHex({ actual: receiver, expected: toAddress })) {
			throw rejected('the swap does not pay the user');
		}

		if (minAmountOut < displayedToAmountMin) {
			throw rejected('the on-chain minimum output is below the one displayed');
		}

		if (!isSameHex({ actual: steps.at(-1)?.receivingAssetId, expected: toToken })) {
			throw rejected('the swap does not end in the destination token');
		}

		return bindSwapSteps({
			steps,
			sourceToken: fromToken,
			amount,
			diamond,
			routeAssets: [fromToken, toToken],
			approvedTokenAddresses,
			dexSwaps: true
		});
	}

	const withSourceSwaps = name.startsWith('swapAndStart');

	const bridgeData = toBridgeData(args[0]);
	const facetData = args[withSourceSwaps ? 2 : 1] as Result;

	if (bridgeData.hasDestinationCall) {
		throw rejected('the route makes a destination call');
	}

	if (bridgeData.hasSourceSwaps !== withSourceSwaps) {
		throw rejected('the bridge data contradicts the function called');
	}

	if (bridgeData.destinationChainId !== BigInt(toChain)) {
		throw rejected('the destination chain differs from the request');
	}

	if (
		!withSourceSwaps &&
		(!isSameHex({ actual: bridgeData.sendingAssetId, expected: fromToken }) ||
			bridgeData.minAmount !== amount)
	) {
		throw rejected('the bridge does not send exactly the amount of the source token');
	}

	const toNonEvm = Number(toChain) === ChainId.SOL;

	if (
		!isSameHex({
			actual: bridgeData.receiver,
			expected: toNonEvm ? LIFI_NON_EVM_ADDRESS : toAddress
		})
	) {
		throw rejected('the bridge data does not pay the user');
	}

	// `SwapperV2` floors the last swap's output at `minAmount`, while the facet sends
	// `bridgeData.sendingAssetId`: if they differed, the bridge would send the Diamond's own balance
	// of another token and leave the user's behind.
	if (
		withSourceSwaps &&
		!isSameHex({ actual: steps.at(-1)?.receivingAssetId, expected: bridgeData.sendingAssetId })
	) {
		throw rejected('the bridge does not send what the swaps before it produce');
	}

	const terms = bridge.terms({ facetData, bridgeData, withSourceSwaps, toNonEvm });

	if (
		(nonNullish(terms.receiver) &&
			!isSameHex({
				actual: terms.receiver,
				expected: toBytes32({ address: toAddress, toNonEvm })
			})) ||
		!isSameHex({ actual: terms.refund, expected: evmAddressToBytes32(fromAddress) })
	) {
		throw rejected("the bridge's own data does not pay or refund the user");
	}

	if (
		nonNullish(terms.sendingAsset) &&
		!isSameHex({
			actual: terms.sendingAsset,
			expected: evmAddressToBytes32(bridgeData.sendingAssetId)
		})
	) {
		throw rejected("the bridge's own data sends another token than the bridged one");
	}

	const receivingAsset = bridge.receivingAsset({ toToken, toChain: Number(toChain), toNonEvm });

	if (
		isNullish(receivingAsset) ||
		!isSameHex({ actual: terms.receivingAsset, expected: receivingAsset })
	) {
		throw rejected('the bridge does not pay out the destination token');
	}

	if (terms.minimumOutput < displayedToAmountMin) {
		throw rejected("the bridge's minimum output is below the one displayed");
	}

	// A relayer named by the response could hold the deposit unfilled, and a far deadline postpone
	// its refund: the user's funds would wait as long as the response chose.
	if (terms.exclusiveFill === true) {
		throw rejected("the bridge's own data reserves the fill to one relayer");
	}

	if (
		nonNullish(terms.fillDeadline) &&
		terms.fillDeadline > nowSeconds + LIFI_ACROSS_MAX_FILL_DEADLINE_SECONDS
	) {
		throw rejected("the bridge's fill deadline is further away than LI.FI sets it");
	}

	return withSourceSwaps
		? bindSwapSteps({
				steps,
				sourceToken: fromToken,
				amount,
				diamond,
				routeAssets: [fromToken, bridgeData.sendingAssetId],
				approvedTokenAddresses,
				dexSwaps: bridge.dexSwaps
			})
		: [];
};
