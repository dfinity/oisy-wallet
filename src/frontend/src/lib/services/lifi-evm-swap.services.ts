import { LIFI_DIAMOND_ADDRESSES } from '$env/rest/lifi.env';
import { infuraProviders } from '$eth/providers/infura.providers';
import { approve as approveToken, erc20ContractAllowance } from '$eth/services/approve.services';
import { getL1DataFee } from '$eth/services/fee.services';
import { swap } from '$eth/services/swap.services';
import type { EthAddress } from '$eth/types/address';
import { isDefinitiveTransactionRefusal } from '$eth/utils/eth-error.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { ZERO, ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import {
	LIFI_ROW_DELETE_ATTEMPTS,
	LIFI_ROW_DELETE_RETRY_DELAY_MILLIS
} from '$lib/constants/swap.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { fetchLifiQuote } from '$lib/rest/lifi.rest';
import {
	createActiveUserTransaction,
	deleteActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import { assertLifiEvmCalldata } from '$lib/services/lifi-calldata.services';
import { enableSwapDestinationToken, waitForSwapAllowance } from '$lib/services/swap.services';
import { i18n } from '$lib/stores/i18n.store';
import { LifiFeeChangedError } from '$lib/types/errors';
import type { NetworkId } from '$lib/types/network';
import type { SwapLifiEvmParams } from '$lib/types/swap';
import { consoleError } from '$lib/utils/console.utils';
import {
	toLifiCreationRefs,
	toLifiData,
	toLifiExternalRefs
} from '$lib/utils/lifi-active-tx.utils';
import {
	lifiApprovalCount,
	lifiQuoteGas,
	lifiUnsignedTxSize,
	withLifiGasBuffer
} from '$lib/utils/lifi-fee.utils';
import { assertLifiQuote } from '$lib/utils/lifi-swap.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { HTTPError, SDKError, type LiFiStep, type QuoteRequestFromAmount } from '@lifi/sdk';
import { makeError } from 'ethers/utils';
import { get } from 'svelte/store';

// 404 is "no available quotes", 422 "none of the available routes could generate a transaction".
const isNoRouteError = (err: unknown): boolean =>
	err instanceof SDKError &&
	err.cause instanceof HTTPError &&
	(err.cause.status === 404 || err.cause.status === 422);

/**
 * Re-quotes `request` and refuses a quote that fails the trust checks. When no route comes back, or
 * its minimum is below the one displayed, the swap aborts as a slippage error, whose message the
 * wizard recognises by its `Slippage exceeded.` prefix.
 */
const requoteAtLeast = async ({
	request,
	sourceNetworkId,
	displayedToAmountMin
}: {
	request: QuoteRequestFromAmount;
	sourceNetworkId: NetworkId;
	displayedToAmountMin: bigint;
}): Promise<LiFiStep> => {
	let quote: LiFiStep;

	try {
		// A copy, because the SDK fills its defaults into the object it is given.
		quote = await fetchLifiQuote({ ...request });
	} catch (err: unknown) {
		if (isNoRouteError(err)) {
			throw new Error('Slippage exceeded. LI.FI no longer has a route for the swap.', {
				cause: err
			});
		}

		throw err;
	}

	assertLifiQuote({ quote, request, sourceNetworkId });

	const toAmountMin = BigInt(quote.estimate.toAmountMin);

	if (toAmountMin < displayedToAmountMin) {
		throw new Error(
			`Slippage exceeded. LI.FI now guarantees ${toAmountMin}, below the ${displayedToAmountMin} displayed.`
		);
	}

	return quote;
};

// The offer's own request, its bridge pinned to the one the user reviewed, so that execution can
// only re-quote the same kind of route.
const toExecutionRequest = ({
	swapDetails,
	request
}: SwapLifiEvmParams['offer']): QuoteRequestFromAmount => {
	const bridge = swapDetails.includedSteps.find(({ type }) => type === 'cross')?.tool;

	return nonNullish(bridge) ? { ...request, allowBridges: [bridge] } : request;
};

/**
 * The most the swap transaction can cost in network fees, as `maxGasFee` counts it: its gas at
 * OISY's fee per gas, plus the OP-stack L1 data fee of a transaction that size, bounded over every
 * nonce it could be signed with. The form, the review and execution all price it so.
 */
const swapFeeCeiling = async ({
	sourceNetwork: { id: networkId, chainId },
	to,
	data,
	value,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas
}: Pick<SwapLifiEvmParams, 'sourceNetwork' | 'maxFeePerGas' | 'maxPriorityFeePerGas'> & {
	to: string;
	data: string;
	value: bigint;
	gas: bigint;
}): Promise<bigint> => {
	const l1Fee = await getL1DataFee({
		chainId,
		provider: infuraProviders(networkId),
		unsignedTxSize: lifiUnsignedTxSize({
			chainId,
			to,
			data,
			value,
			gas,
			maxFeePerGas,
			maxPriorityFeePerGas
		})
	});

	return gas * maxFeePerGas + (l1Fee ?? ZERO);
};

/**
 * The network fee ceiling of the swap transaction a displayed LI.FI quote describes, for the form
 * and the review: LI.FI's own gas estimate for the route, buffered as execution buffers OISY's, at
 * OISY's fees. `undefined` when the quote carries no usable gas estimate or transaction.
 */
export const lifiQuoteFeeCeiling = async ({
	quote,
	...rest
}: Pick<SwapLifiEvmParams, 'sourceNetwork' | 'maxFeePerGas' | 'maxPriorityFeePerGas'> & {
	quote: LiFiStep;
}): Promise<bigint | undefined> => {
	const quoteGas = lifiQuoteGas(quote);
	const { to, data, value } = quote.transactionRequest ?? {};

	if (isNullish(quoteGas) || isNullish(to) || isNullish(data)) {
		return;
	}

	return await swapFeeCeiling({
		...rest,
		to,
		data,
		value: BigInt(value ?? '0x0'),
		gas: withLifiGasBuffer(quoteGas)
	});
};

/**
 * How many approval transactions an ERC-20 swap through the pinned Diamond will send, from a single
 * read of the allowance: `approve()` decides from the same rule. None for a native source. A read
 * that fails budgets the most there can be.
 */
export const lifiApprovalTransactions = async ({
	sourceToken,
	userAddress,
	amount,
	sourceNetwork: { id: networkId }
}: Pick<SwapLifiEvmParams, 'sourceToken' | 'userAddress' | 'sourceNetwork'> & {
	amount: bigint;
}): Promise<0 | 1 | 2> => {
	const diamond = LIFI_DIAMOND_ADDRESSES[networkId];

	if (isDefaultEthereumToken(sourceToken) || isNullish(diamond)) {
		return 0;
	}

	try {
		const allowance = await erc20ContractAllowance({
			token: sourceToken,
			owner: userAddress,
			spender: diamond,
			networkId
		});

		return lifiApprovalCount({ allowance, amount });
	} catch (err: unknown) {
		consoleError(err);

		return 2;
	}
};

// A delete that keeps failing leaves the row to the poller, which settles it as replaced or
// dropped once its nonce is used.
const deleteLifiRow = async ({ identity, id }: { identity: Identity; id: string }) => {
	for (let attempt = 1; attempt <= LIFI_ROW_DELETE_ATTEMPTS; attempt++) {
		try {
			await deleteActiveUserTransaction({ identity, id });

			return;
		} catch (err: unknown) {
			consoleError(err);
		}

		if (attempt < LIFI_ROW_DELETE_ATTEMPTS) {
			await waitForMilliseconds(LIFI_ROW_DELETE_RETRY_DELAY_MILLIS);
		}
	}
};

/**
 * Executes a LI.FI swap from an EVM token, as `fetchVeloraMarketSwap` does a Velora one: approve
 * the pinned Diamond, then sign and broadcast LI.FI's transaction. LI.FI's quotes are unsigned, so
 * nothing of the transaction is taken on trust: the quote whose bytes are signed is re-requested,
 * checked and its calldata bound to the request, its gas is OISY's own estimate, and its fee may
 * not exceed the one the user reviewed.
 *
 * The row is created once the transaction is signed and before it is broadcast, so that no swap is
 * ever broadcast untracked; it is deleted if the node refuses the transaction outright. A broadcast
 * whose outcome is unknown counts as sent: the swap is never offered for signing twice.
 */
export const fetchLifiEvmSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	sourceNetwork,
	userAddress,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	offer,
	reviewedFeeCeiling,
	userTokenAddresses
}: SwapLifiEvmParams): Promise<void> => {
	const { id: sourceNetworkId } = sourceNetwork;
	const diamond = LIFI_DIAMOND_ADDRESSES[sourceNetworkId];
	const request = toExecutionRequest(offer);
	const amount = parseToken({ value: `${swapAmount}`, unitName: sourceToken.decimals });
	const displayedToAmountMin = BigInt(offer.swapDetails.estimate.toAmountMin);

	if (isNullish(diamond) || BigInt(request.fromAmount) !== amount) {
		throw new Error(get(i18n).swap.error.unexpected);
	}

	if (request.fromToken !== ZERO_ETH_ADDRESS) {
		// The price is checked before the approval costs anything, against a quote that is not
		// simulated: the allowance it would need does not exist yet.
		await requoteAtLeast({
			request: { ...request, skipSimulation: true },
			sourceNetworkId,
			displayedToAmountMin
		});

		await approveToken({
			token: sourceToken,
			from: userAddress,
			to: diamond,
			amount,
			sourceNetwork,
			identity,
			gas,
			maxFeePerGas,
			maxPriorityFeePerGas,
			shouldSwapWithApproval: true,
			progress,
			progressSteps: ProgressStepsSwap
		});

		await waitForSwapAllowance({
			token: sourceToken,
			owner: userAddress,
			spender: diamond,
			networkId: sourceNetworkId,
			amount
		});
	}

	progress(ProgressStepsSwap.SWAP);

	// Simulated: the allowance exists by now, and these are the bytes that are signed.
	const executionRequest = { ...request, skipSimulation: false };

	const quote = await requoteAtLeast({
		request: executionRequest,
		sourceNetworkId,
		displayedToAmountMin
	});

	await assertLifiEvmCalldata({
		quote,
		request: executionRequest,
		sourceNetworkId,
		displayedToAmountMin,
		userTokenAddresses
	});

	const { to, data, value: hexValue } = quote.transactionRequest ?? {};

	if (isNullish(to) || isNullish(data)) {
		throw new Error(get(i18n).swap.error.unexpected);
	}

	const value = BigInt(hexValue ?? '0x0');
	const provider = infuraProviders(sourceNetworkId);

	// LI.FI's own gas limit is unsigned, and a failing estimate is a route that would revert.
	const swapGas = withLifiGasBuffer(
		await provider.estimateGas({ from: userAddress, to: to as EthAddress, data, value })
	);

	const feeCeiling = await swapFeeCeiling({
		sourceNetwork,
		to,
		data,
		value,
		gas: swapGas,
		maxFeePerGas,
		maxPriorityFeePerGas
	});

	if (feeCeiling > reviewedFeeCeiling) {
		throw new LifiFeeChangedError(feeCeiling);
	}

	if ((await provider.balance(userAddress)) < value + feeCeiling) {
		throw makeError('insufficient funds for the swap and its network fee', 'INSUFFICIENT_FUNDS', {
			transaction: { from: userAddress, to, data, value }
		});
	}

	const rowData = toLifiData({ sourceToken, destinationToken, amount });

	if (isNullish(rowData)) {
		throw new Error(get(i18n).swap.error.unexpected);
	}

	// Snapshotted rather than derived at settlement, as for the other providers: the row's terminal
	// analytics report the value the user swapped at.
	const sourceTokenExchangeRate = get(exchanges)?.[sourceToken.id]?.usd;

	let rowId: string | undefined;

	const createRow = async ({ hash, nonce }: { hash: string; nonce: number }) => {
		const id = crypto.randomUUID();

		try {
			await createActiveUserTransaction({
				identity,
				id,
				data: rowData,
				externalRefs: toLifiExternalRefs(
					toLifiCreationRefs({
						hash,
						nonce,
						quote,
						sourceToken,
						destinationToken,
						amount: `${swapAmount}`,
						usdSourceValue: nonNullish(sourceTokenExchangeRate)
							? `${Number(swapAmount) * sourceTokenExchangeRate}`
							: undefined
					})
				)
			});
		} catch (err: unknown) {
			// The backend may have committed the row all the same, if only its answer was lost.
			await deleteLifiRow({ identity, id });

			throw err;
		}

		rowId = id;
	};

	try {
		await swap({
			from: userAddress,
			to,
			transaction: {
				from: userAddress,
				to,
				data,
				value: `${value}`,
				gas: `${swapGas}`,
				chainId: Number(sourceNetwork.chainId)
			},
			amount,
			identity,
			token: sourceToken,
			sourceNetwork,
			maxFeePerGas,
			maxPriorityFeePerGas,
			progress,
			beforeBroadcast: createRow
		});
	} catch (err: unknown) {
		// Nothing was broadcast before the row existed.
		if (isNullish(rowId)) {
			throw err;
		}

		// Only a transaction the node refused outright never started.
		if (isDefinitiveTransactionRefusal(err)) {
			await deleteLifiRow({ identity, id: rowId });

			throw err;
		}

		// Any other failure may have relayed the transaction. Signing again would read the next
		// nonce and could swap twice, so the swap goes on as sent: its row settles it, as mined, or as
		// replaced or dropped once its nonce is used.
		consoleError(err);
	}

	progress(ProgressStepsSwap.UPDATE_UI);

	// The destination token is enabled so it stays visible while the swap settles; the balance
	// refresh happens once the row terminalizes.
	await enableSwapDestinationToken({ destinationToken, identity });
};
