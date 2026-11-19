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
	LIFI_APPROVAL_RECEIPT_ATTEMPTS,
	LIFI_APPROVAL_RECEIPT_POLL_MILLIS
} from '$lib/constants/swap.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { assertLifiEvmCalldata } from '$lib/services/lifi-calldata.services';
import {
	createLifiRow,
	deleteLifiRow,
	isSlippageExceeded,
	requoteAtLeast
} from '$lib/services/lifi-swap-execution.services';
import { enableSwapDestinationToken, waitForSwapAllowance } from '$lib/services/swap.services';
import { i18n } from '$lib/stores/i18n.store';
import { LifiFeeChangedError } from '$lib/types/errors';
import type { NetworkId } from '$lib/types/network';
import type { SwapLifiEvmParams } from '$lib/types/swap';
import { consoleError } from '$lib/utils/console.utils';
import { toLifiCreationRefs, toLifiData } from '$lib/utils/lifi-active-tx.utils';
import {
	lifiApprovalCount,
	lifiQuoteGas,
	lifiUnsignedTxSize,
	withLifiGasBuffer,
	withLifiReviewGasBuffer
} from '$lib/utils/lifi-fee.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { HTTPError, SDKError, type LiFiStep, type QuoteRequestFromAmount } from '@lifi/sdk';
import type { TransactionRequest } from 'ethers/providers';
import { makeError } from 'ethers/utils';
import { get } from 'svelte/store';

// Ethers' own error, which the wizard maps to the existing insufficient-funds copy.
const insufficientFundsError = (transaction: TransactionRequest) =>
	makeError('insufficient funds for the swap and its network fee', 'INSUFFICIENT_FUNDS', {
		transaction
	});

// LI.FI validates `allowExchanges` against its own list of exchange keys, and a route's swap step can
// name a tool outside it: the pin is then refused as a bad request (400, code 1011, 2026-10-21).
const isRefusedRequest = (err: unknown): boolean =>
	err instanceof SDKError && err.cause instanceof HTTPError && err.cause.status === 400;

/**
 * `requoteAtLeast` through the exchanges the reviewed route used, for a fee like the one reviewed,
 * and once more through any exchange when they no longer reach the minimum displayed, have no route,
 * or are refused as a pin. The pin is for the fee, while the minimum is what the user agreed to:
 * another exchange that still meets it is no reason to abort, all the more as the review the abort
 * returns to does not refresh its quote, so every retry against that minimum would fail alike.
 * Returns the quote with the request it answers.
 */
const requoteReviewedRoute = async ({
	request,
	...rest
}: Parameters<typeof requoteAtLeast>[0]): Promise<{
	quote: LiFiStep;
	request: QuoteRequestFromAmount;
}> => {
	try {
		return { quote: await requoteAtLeast({ request, ...rest }), request };
	} catch (err: unknown) {
		if (isNullish(request.allowExchanges) || !(isSlippageExceeded(err) || isRefusedRequest(err))) {
			throw err;
		}

		const { allowExchanges: _, ...anyExchange } = request;

		return { quote: await requoteAtLeast({ request: anyExchange, ...rest }), request: anyExchange };
	}
};

// The offer's own request, its bridge and exchanges pinned to the ones the user reviewed, so that
// execution can only re-quote the same kind of route. The exchanges matter to the fee: left free,
// LI.FI re-routes from one quote to the next through exchanges whose gas differs up to twofold
// (258k for Nordstern, 577k for OKX, USDC → ETH on Base, 2026-10-21), and a heavier route than the
// one reviewed refuses the swap as a fee change.
const toExecutionRequest = ({
	swapDetails,
	request
}: SwapLifiEvmParams['offer']): QuoteRequestFromAmount => {
	const bridge = swapDetails.includedSteps.find(({ type }) => type === 'cross')?.tool;
	const exchanges = swapDetails.includedSteps
		.filter(({ type }) => type === 'swap')
		.map(({ tool }) => tool);

	return {
		...request,
		...(nonNullish(bridge) && { allowBridges: [bridge] }),
		// An empty list would forbid every exchange, while a route without a swap needs none.
		...(exchanges.length > 0 && { allowExchanges: exchanges })
	};
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
}): Promise<{ feeCeiling: bigint; l1Fee: bigint }> => {
	const l1Fee =
		(await getL1DataFee({
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
		})) ?? ZERO;

	return { feeCeiling: gas * maxFeePerGas + l1Fee, l1Fee };
};

/**
 * The network fee ceiling of the swap transaction a displayed LI.FI quote describes, for the form
 * and the review: LI.FI's own gas estimate for the route, buffered more than execution buffers the
 * node's, at OISY's fees. `undefined` when the quote carries no usable gas estimate or transaction.
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

	const { feeCeiling } = await swapFeeCeiling({
		...rest,
		to,
		data,
		value: BigInt(value ?? '0x0'),
		gas: withLifiReviewGasBuffer(quoteGas)
	});

	return feeCeiling;
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

// `approve()` returns once the approval is broadcast, and the allowance poll after it gives up within
// two Ethereum blocks: a slow approval would send the swap back to the review still pending, where a
// retry signs a second one. An approval that reverted fails the swap at once. One still unmined
// after the last attempt is left to the poll.
const waitForApproval = async ({ networkId, hash }: { networkId: NetworkId; hash: string }) => {
	const { getTransactionReceipt } = infuraProviders(networkId);

	for (let attempt = 1; attempt <= LIFI_APPROVAL_RECEIPT_ATTEMPTS; attempt++) {
		const receipt = await getTransactionReceipt(hash).catch((err: unknown) => {
			consoleError(err);

			return null;
		});

		if (nonNullish(receipt)) {
			if (receipt.status === 0) {
				throw new Error(get(i18n).swap.error.unexpected);
			}

			return;
		}

		await waitForMilliseconds(LIFI_APPROVAL_RECEIPT_POLL_MILLIS);
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
	reviewedFee,
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
		// The balance check below comes after the approval is paid, so the balance must first cover
		// what the review showed: the swap is never signed above it.
		if ((await infuraProviders(sourceNetworkId).balance(userAddress)) < reviewedFee) {
			throw insufficientFundsError({ from: userAddress });
		}

		// The price is checked before the approval costs anything, against a quote that is not
		// simulated: the allowance it would need does not exist yet. Its calldata is bound too, so
		// that a route the binding refuses costs no approval; the binding runs again on the quote
		// that is signed.
		const { quote: priceQuote, request: priceRequest } = await requoteReviewedRoute({
			request: { ...request, skipSimulation: true },
			sourceNetworkId,
			displayedToAmountMin
		});

		await assertLifiEvmCalldata({
			quote: priceQuote,
			request: priceRequest,
			sourceNetworkId,
			displayedToAmountMin,
			userTokenAddresses
		});

		const { hash: approvalHash } = await approveToken({
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

		if (nonNullish(approvalHash)) {
			await waitForApproval({ networkId: sourceNetworkId, hash: approvalHash });
		}

		await waitForSwapAllowance({
			token: sourceToken,
			owner: userAddress,
			spender: diamond,
			networkId: sourceNetworkId,
			amount
		});
	}

	progress(ProgressStepsSwap.SWAP);

	// Simulated: the allowance exists by now, and these are the bytes that are signed. The binding
	// checks them against the request they answer, the exchange pin dropped if it fell back.
	const { quote, request: executionRequest } = await requoteReviewedRoute({
		request: { ...request, skipSimulation: false },
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

	const { feeCeiling, l1Fee } = await swapFeeCeiling({
		sourceNetwork,
		to,
		data,
		value,
		gas: swapGas,
		maxFeePerGas,
		maxPriorityFeePerGas
	});

	if (feeCeiling > reviewedFeeCeiling) {
		throw new LifiFeeChangedError({ gas: swapGas, l1Fee });
	}

	if ((await provider.balance(userAddress)) < value + feeCeiling) {
		throw insufficientFundsError({ from: userAddress, to, data, value });
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
		rowId = await createLifiRow({
			identity,
			data: rowData,
			refs: toLifiCreationRefs({
				hash,
				source: { nonce },
				quote,
				sourceToken,
				destinationToken,
				amount: `${swapAmount}`,
				usdSourceValue: nonNullish(sourceTokenExchangeRate)
					? `${Number(swapAmount) * sourceTokenExchangeRate}`
					: undefined
			})
		});
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
