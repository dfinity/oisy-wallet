import {
	LIFI_ACROSS_V4_ABI,
	LIFI_APPROVE_TO_ONLY_SELECTOR,
	LIFI_GENERIC_SWAP_ABI,
	LIFI_NEAR_INTENTS_ABI,
	LIFI_NON_EVM_ADDRESS
} from '$eth/constants/lifi.constants';
import type { EthAddress } from '$eth/types/address';
import { ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import { LifiQuoteRejectedError } from '$lib/types/errors';
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

// By LI.FI tool key. A bridge the request allows but which has no facet here is refused: its
// receiver could not be bound.
const bridgeFacets: Record<string, Interface> = {
	across: new Interface(LIFI_ACROSS_V4_ABI),
	near: new Interface(LIFI_NEAR_INTENTS_ABI)
};

const rejected = (reason: string): LifiQuoteRejectedError =>
	new LifiQuoteRejectedError(`LI.FI calldata rejected: ${reason}`);

const isSameHex = ({ actual, expected }: { actual: string | undefined; expected: string }) =>
	nonNullish(actual) && actual.toLowerCase() === expected.toLowerCase();

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
		throw rejected('the Solana recipient is not a Solana address');
	}
};

/**
 * Binds every entry of a route's `SwapData[]`, not only the first. The Diamond pulls `fromAmount` of
 * `sendingAssetId` from the user for each entry with `requiresDeposit`, so only the first may
 * deposit, and exactly the source token and amount; LI.FI's own fee collection is that first entry.
 *
 * Each entry's call runs with the Diamond as `msg.sender`, so the only user funds it could reach are
 * the user's allowances to the Diamond: no call or approval may target the Diamond, an asset of the
 * route, or a token the user holds. What the calls do is left to LI.FI's on-chain whitelist, which
 * the returned calls are confirmed against before signing. An `approveTo` other than `callTo` is
 * looked up under `APPROVE_TO_ONLY_SELECTOR`, as `SwapperV2` does, except for a native sending
 * asset, which is not approved.
 */
const bindSwapSteps = ({
	steps,
	sourceToken,
	amount,
	diamond,
	routeAssets,
	userTokenAddresses
}: {
	steps: LifiSwapStep[];
	sourceToken: string;
	amount: bigint;
	diamond: EthAddress;
	routeAssets: string[];
	userTokenAddresses: string[];
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
			...userTokenAddresses
		].map((address) => address.toLowerCase())
	);

	const calls = new Map<string, LifiWhitelistedCall>();

	const addCall = (call: LifiWhitelistedCall) =>
		calls.set(`${call.contract.toLowerCase()}:${call.selector.toLowerCase()}`, call);

	for (const { callTo, approveTo, callData, sendingAssetId } of steps) {
		if (
			forbiddenTargets.has(callTo.toLowerCase()) ||
			forbiddenTargets.has(approveTo.toLowerCase())
		) {
			throw rejected('a swap targets the Diamond, an asset of the route or a token of the user');
		}

		if (callData.length < 10) {
			throw rejected('a swap makes no call');
		}

		addCall({ contract: callTo, selector: callData.slice(0, 10) });

		if (
			!isSameHex({ actual: approveTo, expected: callTo }) &&
			!isSameHex({ actual: sendingAssetId, expected: ZERO_ETH_ADDRESS })
		) {
			addCall({ contract: approveTo, selector: LIFI_APPROVE_TO_ONLY_SELECTOR });
		}
	}

	return [...calls.values()];
};

// Where each curated bridge pays and refunds: its own data, which is what the bridge consumes, not
// `bridgeData.receiver` alone.
const bridgeReceiversAreTheUser: Record<
	string,
	(params: {
		facetData: Record<string, string>;
		receiver: string;
		refund: string;
		toNonEvm: boolean;
	}) => boolean
> = {
	// `AcrossV4Data` starts with the receiver the relayer pays, then the address a refund goes to.
	across: ({ facetData: { receiverAddress, refundAddress }, receiver, refund }) =>
		isSameHex({ actual: receiverAddress, expected: receiver }) &&
		isSameHex({ actual: refundAddress, expected: evmAddressToBytes32(refund) }),
	// `NEARIntentsData.nonEVMReceiver` is the receiver of a non-EVM route only: for an EVM one the
	// facet signs over `bridgeData.receiver` and does not read it. Leftovers and refunds go to
	// `refundRecipient`.
	near: ({ facetData: { nonEVMReceiver, refundRecipient }, receiver, refund, toNonEvm }) =>
		(!toNonEvm || isSameHex({ actual: nonEVMReceiver, expected: receiver })) &&
		isSameHex({ actual: refundRecipient, expected: refund })
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
 *
 * Returns the swap calls that the Diamond's whitelist must still confirm.
 */
export const assertLifiCalldata = ({
	quote,
	request,
	diamond,
	displayedToAmountMin,
	userTokenAddresses
}: {
	quote: LiFiStep;
	request: QuoteRequestFromAmount;
	diamond: EthAddress;
	displayedToAmountMin: bigint;
	userTokenAddresses: string[];
}): LifiWhitelistedCall[] => {
	const data = quote.transactionRequest?.data;
	const { fromChain, toChain, fromToken, toToken, fromAddress, toAddress, fromAmount } = request;

	if (isNullish(data) || !/^0x[\da-fA-F]{8,}$/.test(data)) {
		throw rejected('no calldata');
	}

	if (isNullish(toAddress)) {
		throw rejected('the request has no recipient');
	}

	const amount = BigInt(fromAmount);

	if (Number(fromChain) === Number(toChain)) {
		const { name, args } = parseCall({ facet: genericSwapFacet, data });
		const [, , , receiver, minAmountOut, swapData] = args;

		const steps = name.startsWith('swapTokensSingle')
			? [toSwapStep(swapData)]
			: (swapData as Result[]).map(toSwapStep);

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
			userTokenAddresses
		});
	}

	const selector = data.slice(0, 10).toLowerCase();
	const tool = request.allowBridges?.find((key) =>
		nonNullish(bridgeFacets[key]?.getFunction(selector))
	);
	const facet = nonNullish(tool) ? bridgeFacets[tool] : undefined;
	const receiversAreTheUser = nonNullish(tool) ? bridgeReceiversAreTheUser[tool] : undefined;

	if (isNullish(tool) || isNullish(facet) || isNullish(receiversAreTheUser)) {
		throw rejected('a cross-chain route calls a function of no bridge the request allowed');
	}

	const { name, args } = parseCall({ facet, data });
	const withSourceSwaps = name.startsWith('swapAndStart');

	const bridgeData = toBridgeData(args[0]);
	const steps = withSourceSwaps ? (args[1] as Result[]).map(toSwapStep) : [];
	const facetData = (args[withSourceSwaps ? 2 : 1] as Result).toObject();

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

	if (
		!receiversAreTheUser({
			facetData,
			receiver: toNonEvm ? solanaAddressToBytes32(toAddress) : evmAddressToBytes32(toAddress),
			refund: fromAddress,
			toNonEvm
		})
	) {
		throw rejected("the bridge's own data does not pay or refund the user");
	}

	return withSourceSwaps
		? bindSwapSteps({
				steps,
				sourceToken: fromToken,
				amount,
				diamond,
				routeAssets: [fromToken, bridgeData.sendingAssetId],
				userTokenAddresses
			})
		: [];
};
