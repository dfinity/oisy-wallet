import { ONESEC_SWAP_ENABLED } from '$env/rest/onesec.env';
import { send } from '$eth/services/send.services';
import type { IcToken } from '$icp/types/ic-token';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { getAgent } from '$lib/actors/agents.ic';
import { authIdentity } from '$lib/derived/auth.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import {
	SwapProvider,
	type EvmQuoteParams,
	type IcpBridgeQuoteParams,
	type OneSecEvmToIcpParams,
	type OneSecIcpToEvmParams,
	type SwapMappedResult
} from '$lib/types/swap';
import { consoleError } from '$lib/utils/console.utils';
import { isNetworkIdICP } from '$lib/utils/network.utils';
import { computeReceiveAmount, ICP_LEDGER_TO_TOKEN } from '$lib/utils/onesec-swap.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	EvmToIcpBridgeBuilder,
	IcpToEvmBridgeBuilder,
	type BridgingPlan,
	type EvmChain
} from 'onesec-bridge';
import { get } from 'svelte/store';

const resolveQuoteFromPlan = async ({
	plan,
	amount,
	decimals
}: {
	plan: BridgingPlan;
	amount: bigint;
	decimals: number;
}): Promise<SwapMappedResult | undefined> => {
	const feeStep = plan.nextStepToRun();
	if (!feeStep) {
		return;
	}

	const status = await feeStep.run();
	if (status.state !== 'succeeded' || !status.expectedFee) {
		return;
	}

	const transferFeeInUnits = status.expectedFee.transferFee().inUnits;
	const protocolFeeInPercent = status.expectedFee.protocolFeeInPercent();

	return {
		provider: SwapProvider.ONE_SEC,
		receiveAmount: computeReceiveAmount({
			amount,
			transferFeeInUnits,
			protocolFeeInPercent,
			decimals
		}),
		swapDetails: { transferFeeInUnits, protocolFeeInPercent }
	};
};

/**
 * Fetches a OneSec bridge quote for the EVM → ICP direction.
 * Called from evmSwapProviders when the source is EVM and destination is an ICP token.
 */
export const fetchOneSecEvmToIcpQuote = async ({
	sourceToken,
	destinationToken,
	amount
}: EvmQuoteParams): Promise<SwapMappedResult | undefined> => {
	const identity = get(authIdentity);
	if (!ONESEC_SWAP_ENABLED || isNullish(identity) || !isNetworkIdICP(destinationToken.network.id)) {
		return;
	}

	const entry = ICP_LEDGER_TO_TOKEN[(destinationToken as IcToken).ledgerCanisterId];
	if (isNullish(entry)) {
		return;
	}

	try {
		const plan = await new EvmToIcpBridgeBuilder(sourceToken.network.name as EvmChain, entry.token)
			.receiver(identity.getPrincipal())
			.amountInUnits(amount)
			.forward();

		return resolveQuoteFromPlan({ plan, amount, decimals: destinationToken.decimals });
	} catch (e) {
		consoleError(e);
	}
};

/**
 * Fetches a OneSec bridge quote for the ICP → EVM direction.
 * Called from icpBridgeProviders when source is an ICP token and destination is EVM.
 */
export const fetchOneSecIcpToEvmQuote = async ({
	sourceToken,
	destinationToken,
	amount,
	userEthAddress
}: IcpBridgeQuoteParams): Promise<SwapMappedResult | undefined> => {
	const identity = get(authIdentity);
	if (
		!ONESEC_SWAP_ENABLED ||
		isNullish(identity) ||
		!isIcToken(sourceToken) ||
		isNullish(userEthAddress)
	) {
		return;
	}

	const entry = ICP_LEDGER_TO_TOKEN[sourceToken.ledgerCanisterId];
	if (isNullish(entry)) {
		return;
	}

	try {
		const agent = await getAgent({ identity });
		const plan = await new IcpToEvmBridgeBuilder(
			agent,
			destinationToken.network.name as EvmChain,
			entry.token
		)
			.receiver(userEthAddress)
			.amountInUnits(amount)
			.build();

		return resolveQuoteFromPlan({ plan, amount, decimals: destinationToken.decimals });
	} catch (e) {
		consoleError(e);
	}
};

/**
 * Executes an ICP → EVM bridge via OneSec.
 *
 * Rebuilds the bridging plan (re-validating fees) and runs all steps in sequence,
 * reporting progress through the provided callback. Throws on failure; callers are
 * responsible for enabling the destination token and triggering a wallet refresh.
 */
export const executeOneSecIcpToEvmBridge = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	userEthAddress,
	setFailedProgressStep
}: OneSecIcpToEvmParams): Promise<void> => {
	const entry = ICP_LEDGER_TO_TOKEN[sourceToken.ledgerCanisterId];

	if (isNullish(entry)) {
		throw new Error('Source token is not supported by the OneSec bridge');
	}

	const parsedAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});

	const agent = await getAgent({ identity });

	const plan = await new IcpToEvmBridgeBuilder(
		agent,
		destinationToken.network.name as EvmChain,
		entry.token
	)
		.sender(identity.getPrincipal())
		.receiver(userEthAddress)
		.amountInUnits(parsedAmount)
		.build();

	let step;
	while ((step = plan.nextStepToRun()) !== undefined) {
		// Step 0 is the fee-check step — keep the UI at INITIALIZATION.
		// Step 1+ are the actual bridge operations (approve, transfer, wait for EVM tx).
		if (step.index() >= 1) {
			progress(ProgressStepsSwap.SWAP);
		}

		const result = await step.run();

		if (result.state === 'failed') {
			setFailedProgressStep?.(ProgressStepsSwap.SWAP);
			throw new Error(result.error?.message ?? 'OneSec bridge step failed unexpectedly');
		}
	}
};

/**
 * Executes an EVM → ICP bridge via OneSec using a forwarding address.
 *
 * Builds a forwarding plan, retrieves the deterministic forwarding address, sends the
 * EVM tokens to that address using OISY's send service, then runs the remaining SDK
 * steps (notify, validate, wait for ICP tx). Throws on failure; callers are responsible
 * for enabling the destination token and triggering a wallet refresh.
 */
export const executeOneSecEvmToIcpBridge = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	userEthAddress,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	setFailedProgressStep
}: OneSecEvmToIcpParams): Promise<void> => {
	const entry = ICP_LEDGER_TO_TOKEN[destinationToken.ledgerCanisterId];
	if (isNullish(entry)) {
		throw new Error('Destination token is not supported by the OneSec bridge');
	}

	const parsedAmount = parseToken({
		value: `${swapAmount}`,
		unitName: sourceToken.decimals
	});

	const plan = await new EvmToIcpBridgeBuilder(sourceToken.network.name as EvmChain, entry.token)
		.receiver(identity.getPrincipal())
		.amountInUnits(parsedAmount)
		.forward();

	// Step 0: fee validation
	let step = plan.nextStepToRun();
	if (nonNullish(step)) {
		const result = await step.run();
		if (result.state === 'failed') {
			setFailedProgressStep?.(ProgressStepsSwap.SWAP);
			throw new Error(result.error?.message ?? 'OneSec fee check failed');
		}
	}

	// Step 1: compute forwarding address
	step = plan.nextStepToRun();
	if (isNullish(step)) {
		throw new Error('OneSec bridge plan is missing the forwarding address step');
	}

	const addressResult = await step.run();
	if (addressResult.state === 'failed' || isNullish(addressResult.forwardingAddress)) {
		setFailedProgressStep?.(ProgressStepsSwap.SWAP);
		throw new Error(
			addressResult.error?.message ?? 'Failed to compute the OneSec forwarding address'
		);
	}

	// Send EVM tokens to the forwarding address
	progress(ProgressStepsSwap.SWAP);
	await send({
		identity,
		token: sourceToken,
		from: userEthAddress,
		to: addressResult.forwardingAddress,
		amount: parsedAmount,
		sourceNetwork: sourceToken.network,
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas
	});

	// Run remaining steps: notify OneSec, validate receipt, wait for ICP tx
	while ((step = plan.nextStepToRun()) !== undefined) {
		const result = await step.run();
		if (result.state === 'failed') {
			setFailedProgressStep?.(ProgressStepsSwap.SWAP);
			throw new Error(result.error?.message ?? 'OneSec bridge step failed unexpectedly');
		}
	}
};
