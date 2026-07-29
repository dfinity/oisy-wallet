import type {
	ActiveUserTransaction,
	ActiveUserTransactionData,
	ActiveUserTransactionStatus
} from '$declarations/backend/backend.did';
import { ONESEC_SWAP_ENABLED } from '$env/rest/onesec.env';
import { send } from '$eth/services/send.services';
import type { IcToken } from '$icp/types/ic-token';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { getAgent } from '$lib/actors/agents.ic';
import { ONESEC_FORWARDING_NOTIFY_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { authIdentity } from '$lib/derived/auth.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import {
	applyActiveUserTransactionPollUpdate,
	createActiveUserTransaction,
	updateActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import { ONESEC_EXTERNAL_REF_KEYS, type OneSecExternalRefKey } from '$lib/types/onesec-swap';
import {
	SwapProvider,
	type EvmQuoteParams,
	type IcpBridgeQuoteParams,
	type OneSecEvmToIcpParams,
	type OneSecIcpToEvmParams,
	type SwapMappedResult
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import {
	advanceStatus,
	isTerminalActiveUserTransactionStatus
} from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import { isNetworkIdICP } from '$lib/utils/network.utils';
import {
	computeReceiveAmount,
	findMatchingOneSecTransfer,
	ICP_LEDGER_TO_TOKEN,
	oneSecStatusError,
	toActiveUserTransactionStatus,
	toOneSecDisplayRefs,
	toOneSecEvmToIcpData,
	toOneSecExternalRefs,
	toOneSecIcpToEvmData
} from '$lib/utils/onesec-swap.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import {
	EvmToIcpBridgeBuilder,
	getTransfers,
	IcpToEvmBridgeBuilder,
	oneSecForwarding,
	type BridgingPlan,
	type EvmChain,
	type Step,
	type Transfer,
	type TransferId
} from 'onesec-bridge';
import { get } from 'svelte/store';

const stepFailureMessage = ({
	result,
	fallback
}: {
	result: { verbose?: string; error?: { message?: string } } | undefined;
	fallback: string;
}): string => result?.verbose ?? result?.error?.message ?? fallback;

// SDK typing gap: `StepStatus.transferId` is never populated; the id lives on
// the concrete step subclass instance.
const getStepTransferId = (step: Step): TransferId | undefined => {
	if (
		'getTransferId' in step &&
		typeof (step as { getTransferId: unknown }).getTransferId === 'function'
	) {
		return (step as Step & { getTransferId: () => TransferId | undefined }).getTransferId();
	}

	return undefined;
};

// Snapshot of the most-recently-completed forwarding id taken before the new
// deposit. Persisted as a baseline so the poller can reject stale `done` ids.
const getStepLastTransferId = (step: Step): TransferId | undefined => {
	if (
		'getLastTransferId' in step &&
		typeof (step as { getLastTransferId: unknown }).getLastTransferId === 'function'
	) {
		return (step as Step & { getLastTransferId: () => TransferId | undefined }).getLastTransferId();
	}
	return undefined;
};

// Runs detached. Writes the terminal status when the plan completes (or a step
// reports failed/refunded) and persists `TRANSFER_ID` for EVM→ICP rows the
// first time a step exposes it. Unexpected throws leave the row pending so the
// cross-session AUT poller can finish the job.
const finishOneSecBridgingInSession = async ({
	identity,
	id,
	plan,
	initialRefs
}: {
	identity: Identity;
	id: string;
	plan: BridgingPlan;
	initialRefs: Partial<Record<OneSecExternalRefKey, string>>;
}): Promise<void> => {
	const writeTerminal = async (params: {
		status: ActiveUserTransactionStatus;
		error?: string;
	}): Promise<void> => {
		try {
			await updateActiveUserTransaction({ identity, id, ...params });
		} catch (err: unknown) {
			consoleError(err);
		}
	};

	let refs: Partial<Record<OneSecExternalRefKey, string>> = { ...initialRefs };
	let transferIdPersisted = nonNullish(refs[ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID]);

	try {
		let step;

		while (nonNullish((step = plan.nextStepToRun()))) {
			const result = await step.run();

			if (!transferIdPersisted) {
				const stepTransferId = getStepTransferId(step);
				if (nonNullish(stepTransferId)) {
					refs = {
						...refs,
						[ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID]: stepTransferId.id.toString()
					};
					try {
						await updateActiveUserTransaction({
							identity,
							id,
							externalRefs: toOneSecExternalRefs(refs)
						});
					} catch (err: unknown) {
						consoleError(err);
					}
					transferIdPersisted = true;
				}
			}

			if (result.state === 'failed' || result.state === 'refunded') {
				break;
			}
		}

		// Refunded plans must land as Failed, not Succeeded.
		const latest = plan.latestStep()?.status();
		if (latest?.state === 'failed' || latest?.state === 'refunded') {
			await writeTerminal({
				status: { Failed: null },
				error: stepFailureMessage({
					result: latest,
					fallback: 'OneSec bridge did not deliver the destination tokens'
				})
			});
			return;
		}

		await writeTerminal({ status: { Succeeded: null } });
	} catch (err: unknown) {
		// The plan threw unexpectedly (network blip, canister unreachable) — the
		// bridge outcome is unknown, and the user's funds are already committed.
		// A terminal Failed here would drop the row from the pending poll set and
		// permanently disable cross-session recovery, so leave it pending: the AUT
		// poller resumes tracking (and re-notifies OneSec for EVM→ICP deposits).
		consoleError(err);
	}
};

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

// Creates the AUT row and detaches the closer that writes the terminal status.
const createAutAndDetachCloser = async ({
	identity,
	swapId,
	data,
	sourceToken,
	destinationToken,
	swapAmount,
	extraRefs,
	plan
}: {
	identity: Identity;
	swapId: string;
	data: ActiveUserTransactionData;
	sourceToken: Token;
	destinationToken: Token;
	swapAmount: string | number;
	extraRefs: Partial<Record<OneSecExternalRefKey, string>>;
	plan: BridgingPlan;
}): Promise<void> => {
	const initialRefs: Partial<Record<OneSecExternalRefKey, string>> = {
		...toOneSecDisplayRefs({
			sourceToken,
			destinationToken,
			amount: `${swapAmount}`
		}),
		...extraRefs
	};

	// AUT persistence is best-effort: a failed `createActiveUserTransaction`
	// must NOT abort the plan. The user has already committed funds (point of
	// no return), so the closer is the only path that completes the bridge —
	// it always runs, persisted row or not.
	try {
		await createActiveUserTransaction({
			identity,
			id: swapId,
			data,
			externalRefs: toOneSecExternalRefs(initialRefs)
		});
	} catch (err: unknown) {
		consoleError(err);
	}

	finishOneSecBridgingInSession({ identity, id: swapId, plan, initialRefs });
};

// Foreground resolves once the ICP-side transfer is initiated (point of no
// return); the row is born with `TRANSFER_ID` and the closer runs detached.
// Foreground failures throw without creating an AUT row.
export const executeOneSecIcpToEvmBridge = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	userEthAddress,
	setFailedProgressStep,
	swapId
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

	let transferId: TransferId | undefined;
	let step;

	while (isNullish(transferId) && nonNullish((step = plan.nextStepToRun()))) {
		// Step 0 is the fee check; step 1+ are the actual bridge operations.
		if (step.index() >= 1) {
			progress(ProgressStepsSwap.SWAP);
		}

		const result = await step.run();

		if (result.state === 'failed' || result.state === 'refunded') {
			setFailedProgressStep?.(ProgressStepsSwap.SWAP);
			throw new Error(
				stepFailureMessage({ result, fallback: 'OneSec bridge step failed unexpectedly' })
			);
		}

		transferId = getStepTransferId(step);
	}

	if (isNullish(transferId)) {
		if (plan.latestStep()?.status().state === 'failed') {
			throw new Error('OneSec bridge plan did not initiate a transfer');
		}

		return;
	}

	await createAutAndDetachCloser({
		identity,
		swapId,
		data: toOneSecIcpToEvmData({
			sourceToken,
			destinationToken,
			amount: parsedAmount,
			recipientEvmAddress: userEthAddress
		}),
		sourceToken,
		destinationToken,
		swapAmount,
		extraRefs: { [ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID]: transferId.id.toString() },
		plan
	});
};

// Foreground runs fee check + forwarding-address + EVM send; the row is born
// with `FORWARDING_ADDRESS` + `BASELINE_TRANSFER_ID` after `send()` resolves.
// Foreground failures throw without creating an AUT row.
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
	setFailedProgressStep,
	swapId
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

	let step = plan.nextStepToRun();
	if (nonNullish(step)) {
		const result = await step.run();
		if (result.state === 'failed') {
			setFailedProgressStep?.(ProgressStepsSwap.SWAP);
			throw new Error(stepFailureMessage({ result, fallback: 'OneSec fee check failed' }));
		}
	}

	step = plan.nextStepToRun();
	if (isNullish(step)) {
		throw new Error('OneSec bridge plan is missing the forwarding address step');
	}

	const addressResult = await step.run();
	if (addressResult.state === 'failed' || isNullish(addressResult.forwardingAddress)) {
		setFailedProgressStep?.(ProgressStepsSwap.SWAP);
		throw new Error(
			stepFailureMessage({
				result: addressResult,
				fallback: 'Failed to compute the OneSec forwarding address'
			})
		);
	}

	const { forwardingAddress } = addressResult;
	const baselineTransferId = getStepLastTransferId(step);

	progress(ProgressStepsSwap.SWAP);
	await send({
		identity,
		token: sourceToken,
		from: userEthAddress,
		to: forwardingAddress,
		amount: parsedAmount,
		sourceNetwork: sourceToken.network,
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas
	});

	await createAutAndDetachCloser({
		identity,
		swapId,
		data: toOneSecEvmToIcpData({
			sourceToken,
			destinationToken,
			amount: parsedAmount,
			recipientPrincipal: identity.getPrincipal()
		}),
		sourceToken,
		destinationToken,
		swapAmount,
		extraRefs: {
			[ONESEC_EXTERNAL_REF_KEYS.FORWARDING_ADDRESS]: forwardingAddress,
			[ONESEC_EXTERNAL_REF_KEYS.BASELINE_TRANSFER_ID]: nonNullish(baselineTransferId)
				? baselineTransferId.id.toString()
				: '0'
		},
		plan
	});
};

// --- AUT polling --------------------------------------------------------

const TRANSFERS_FETCH_COUNT = 50;

const findTransferIdRef = (tx: ActiveUserTransaction): TransferId | undefined => {
	const ref = tx.external_refs.find(({ key }) => key === ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID);

	if (isNullish(ref)) {
		return undefined;
	}

	try {
		return { id: BigInt(ref.value) };
	} catch {
		return undefined;
	}
};

const findForwardingAddressRef = (tx: ActiveUserTransaction): string | undefined =>
	tx.external_refs.find(({ key }) => key === ONESEC_EXTERNAL_REF_KEYS.FORWARDING_ADDRESS)?.value;

// Used by the discovery path to reject stale `done` ids from prior swaps.
const findBaselineTransferIdRef = (tx: ActiveUserTransaction): bigint | undefined => {
	const ref = tx.external_refs.find(
		({ key }) => key === ONESEC_EXTERNAL_REF_KEYS.BASELINE_TRANSFER_ID
	);

	if (isNullish(ref)) {
		return undefined;
	}

	try {
		return BigInt(ref.value);
	} catch {
		return undefined;
	}
};

const evmChainFromChainId = (chainId: bigint): EvmChain | undefined => {
	switch (chainId) {
		case 1n:
			return 'Ethereum';
		case 8453n:
			return 'Base';
		case 42161n:
			return 'Arbitrum';
		default:
			return undefined;
	}
};

// `forward_evm_to_icp` is the only trigger that makes OneSec sweep a
// forwarding address — if the in-session closer dies between the EVM deposit
// and its notify step, no read-only poll will ever move the funds. The poller
// therefore re-notifies pending EVM→ICP rows, throttled per row because
// notifying is an update call while the poller ticks every few seconds
// (between notifications it falls back to the read-only status lookup).
const lastForwardingNotifyMs = new Map<string, number>();

const shouldNotifyForwarding = (txId: string): boolean => {
	const now = Date.now();
	const last = lastForwardingNotifyMs.get(txId);

	if (nonNullish(last) && now - last < ONESEC_FORWARDING_NOTIFY_INTERVAL_MILLIS) {
		return false;
	}

	lastForwardingNotifyMs.set(txId, now);

	return true;
};

export const resetOneSecForwardingNotifyThrottle = (): void => {
	lastForwardingNotifyMs.clear();
};

// Discovers TRANSFER_ID for cross-session EVM→ICP rows via the forwarding
// status, re-notifying OneSec (see `shouldNotifyForwarding`) so a deposit
// stranded at the forwarding address is picked up again.
// Forwarding addresses are deterministic per principal, so `response.done` can
// point at a *prior* swap's id; we require `done.id > BASELINE_TRANSFER_ID` and
// skip discovery entirely when the baseline ref is missing.
const tryDiscoverEvmToIcpTransferId = async ({
	tx,
	identity
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
}): Promise<TransferId | undefined> => {
	if (!('OneSecEvmToIcp' in tx.data)) {
		return undefined;
	}

	const forwardingAddress = findForwardingAddressRef(tx);
	if (isNullish(forwardingAddress)) {
		return undefined;
	}

	const baseline = findBaselineTransferIdRef(tx);
	if (isNullish(baseline)) {
		return undefined;
	}

	const data = tx.data.OneSecEvmToIcp;

	if (!('Icrc' in data.dest_token) || !('Erc20' in data.source_token)) {
		return undefined;
	}

	const oneSecToken = ICP_LEDGER_TO_TOKEN[data.dest_token.Icrc.toText()]?.token;
	if (isNullish(oneSecToken)) {
		return undefined;
	}

	const chain = evmChainFromChainId(data.source_token.Erc20[1]);
	if (isNullish(chain)) {
		return undefined;
	}

	try {
		const forwarding = oneSecForwarding();
		const receiver = { owner: data.recipient_principal };

		const response = shouldNotifyForwarding(tx.id)
			? await forwarding.forwardEvmToIcp(oneSecToken, chain, forwardingAddress, receiver)
			: await forwarding.getForwardingStatus(oneSecToken, chain, forwardingAddress, receiver);

		if (isNullish(response.done) || response.done.id <= baseline) {
			return undefined;
		}

		// Sort to match `toOneSecExternalRefs`'s deterministic ordering.
		const mergedRefs = [
			...tx.external_refs.filter(({ key }) => key !== ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID),
			{
				key: ONESEC_EXTERNAL_REF_KEYS.TRANSFER_ID,
				value: response.done.id.toString()
			}
		].sort((a, b) => a.key.localeCompare(b.key));

		await updateActiveUserTransaction({
			identity,
			id: tx.id,
			externalRefs: mergedRefs
		});

		lastForwardingNotifyMs.delete(tx.id);

		return response.done;
	} catch (err: unknown) {
		consoleError(err);
		return undefined;
	}
};

// `getTransfers` doesn't expose ids (SDK gap), so the listing-match fallback
// is only allowed to advance Pending → Executing; terminal writes require an
// exact `getTransfer(transferId)` lookup.
const pollOneSecActiveUserTransaction = async ({
	tx,
	identity,
	fetchTransfersOnce
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
	fetchTransfersOnce: () => Promise<Transfer[]>;
}): Promise<void> => {
	try {
		const transferIdRef =
			findTransferIdRef(tx) ?? (await tryDiscoverEvmToIcpTransferId({ tx, identity }));

		const transfer: Transfer | undefined = nonNullish(transferIdRef)
			? await oneSecForwarding().getTransfer(transferIdRef)
			: findMatchingOneSecTransfer({
					transfers: await fetchTransfersOnce(),
					data: tx.data
				});

		if (isNullish(transfer) || isNullish(transfer.status)) {
			return;
		}

		const candidate = toActiveUserTransactionStatus(transfer.status);

		if (isNullish(candidate)) {
			return;
		}

		const next = advanceStatus({ current: tx.status, candidate });

		if (isNullish(next)) {
			return;
		}

		// Terminal verdicts require an exact `getTransfer(transferId)` lookup.
		if (isNullish(transferIdRef) && isTerminalActiveUserTransactionStatus(next)) {
			return;
		}

		const error = oneSecStatusError(transfer.status);

		await applyActiveUserTransactionPollUpdate({
			identity,
			tx,
			update: {
				status: next,
				...(nonNullish(error) ? { error } : {})
			}
		});
	} catch (err: unknown) {
		consoleError(err);
	}
};

// Shares a single `getTransfers` round-trip across the batch via promise memo.
export const pollOneSecActiveUserTransactions = async ({
	identity,
	transactions
}: {
	identity: Identity;
	transactions: ActiveUserTransaction[];
}): Promise<void> => {
	if (transactions.length === 0) {
		return;
	}

	let transfersPromise: Promise<Transfer[]> | undefined;
	const fetchTransfersOnce = (): Promise<Transfer[]> =>
		(transfersPromise ??= getTransfers(identity.getPrincipal(), { count: TRANSFERS_FETCH_COUNT }));

	await Promise.all(
		transactions.map((tx) => pollOneSecActiveUserTransaction({ tx, identity, fetchTransfersOnce }))
	);
};
