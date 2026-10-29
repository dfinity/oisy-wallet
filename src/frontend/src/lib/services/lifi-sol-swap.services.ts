import {
	SWAP_BROADCAST_ATTEMPTS,
	SWAP_BROADCAST_RETRY_DELAY_MILLIS
} from '$lib/constants/swap.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { assertLifiSolTransaction } from '$lib/services/lifi-sol-transaction.services';
import {
	createLifiRow,
	deleteLifiRow,
	requoteAtLeast
} from '$lib/services/lifi-swap-execution.services';
import { enableSwapDestinationToken } from '$lib/services/swap.services';
import { i18n } from '$lib/stores/i18n.store';
import { SwapBroadcastOutcomeUnknownError } from '$lib/types/errors';
import type { SwapLifiSolParams } from '$lib/types/swap';
import { consoleError } from '$lib/utils/console.utils';
import { toLifiCreationRefs, toLifiData } from '$lib/utils/lifi-active-tx.utils';
import { decodeLifiSolTransaction } from '$lib/utils/lifi-swap.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import { sendSignedTransaction } from '$sol/services/sol-send.services';
import { SolanaNetworks } from '$sol/types/network';
import type { SolSignedTransaction } from '$sol/types/sol-transaction';
import {
	isSolNodeUnhealthy,
	isSolSendRefusal,
	isSolTransactionAlreadyProcessed
} from '$sol/utils/sol-error.utils';
import { signTransaction } from '$sol/utils/sol-sign.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	assertIsFullySignedTransaction,
	assertIsTransactionWithBlockhashLifetime,
	assertIsTransactionWithinSizeLimit,
	getCompiledTransactionMessageDecoder,
	getSignatureFromTransaction,
	getTransactionLifetimeConstraintFromCompiledTransactionMessage
} from '@solana/kit';
import { get } from 'svelte/store';

/**
 * Sends the signed bytes again while the node has neither refused them nor taken them: a transport
 * failure would otherwise leave a signed swap unsent, and one signature lands once only. The node's
 * refusal (`isSolSendRefusal`) forwards nothing; a preflight reporting the transaction already
 * processed is its landing. A node too far behind the cluster refuses before its preflight, and is
 * answered by sending the same bytes again, which another node may take; once the attempts run out,
 * that refusal stands.
 *
 * Once an attempt has failed in a way that may have relayed them, no later answer shows they were
 * not taken: a refusal then answers only its own attempt, against a state the first may have moved
 * (a price past the slippage, a balance the first is about to spend). The broadcast then ends with an
 * unknown outcome, as it does once the attempts run out.
 */
const broadcast = async (signedTransaction: SolSignedTransaction): Promise<void> => {
	const rpc = solanaHttpRpc(SolanaNetworks.mainnet);

	let relayed = false;

	for (let attempt = 1; ; attempt++) {
		try {
			await sendSignedTransaction({ rpc, signedTransaction });

			return;
		} catch (err: unknown) {
			if (isSolTransactionAlreadyProcessed(err)) {
				return;
			}

			if (isSolSendRefusal(err)) {
				if (relayed) {
					throw new SwapBroadcastOutcomeUnknownError({ cause: err });
				}

				if (!isSolNodeUnhealthy(err) || attempt >= SWAP_BROADCAST_ATTEMPTS) {
					throw err;
				}
			} else {
				if (attempt >= SWAP_BROADCAST_ATTEMPTS) {
					throw new SwapBroadcastOutcomeUnknownError({ cause: err });
				}

				relayed = true;
			}

			consoleError(err);
		}

		await waitForMilliseconds(SWAP_BROADCAST_RETRY_DELAY_MILLIS);
	}
};

/**
 * Executes a LI.FI Solana → Solana swap: re-quotes it, binds the transaction to the request, signs
 * LI.FI's own bytes and broadcasts them. LI.FI's quotes are unsigned, so nothing of the transaction
 * is taken on trust: the quote whose bytes are signed is re-requested with its exchanges still pinned
 * to those the binding checks, passes the trust checks, may not guarantee less than the minimum
 * displayed, and is bound by `assertLifiSolTransaction`, its LI.FI ceiling included.
 *
 * The bytes signed are the message LI.FI built, never a recompiled one: decompiled and compiled again
 * without its lookup tables, a route can outgrow the size limit, and it would no longer be the
 * transaction simulated. The re-quote is what keeps its blockhash fresh.
 *
 * The row is created once the transaction is signed and before it is broadcast, so that no swap is
 * ever broadcast untracked; it is deleted only if the node refuses an attempt no earlier one may have
 * relayed. Any other end counts as sent, and the poller settles the row as landed or, once its
 * blockhash expires, never landed.
 */
export const fetchLifiSolSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	userAddress,
	offer,
	reviewedCeiling
}: SwapLifiSolParams): Promise<void> => {
	const { request } = offer;
	const amount = parseToken({ value: `${swapAmount}`, unitName: sourceToken.decimals });
	const displayedToAmountMin = BigInt(offer.swapDetails.estimate.toAmountMin);

	if (BigInt(request.fromAmount) !== amount || request.fromAddress !== userAddress) {
		throw new Error(get(i18n).swap.error.unexpected);
	}

	progress(ProgressStepsSwap.SWAP);

	// Simulated: the displayed quote's blockhash is likely stale, and these are the bytes signed.
	const quote = await requoteAtLeast({
		request: { ...request, skipSimulation: false },
		sourceNetworkId: sourceToken.network.id,
		displayedToAmountMin
	});

	const { simulationSlot } = await assertLifiSolTransaction({
		quote,
		request,
		displayedToAmountMin,
		reviewedCeiling
	});

	const transaction = decodeLifiSolTransaction({
		data: quote.transactionRequest?.data,
		userAddress
	});

	const [signatures, lifetimeConstraint] = await Promise.all([
		signTransaction({
			identity,
			transaction,
			address: userAddress,
			network: SolanaNetworks.mainnet
		}),
		getTransactionLifetimeConstraintFromCompiledTransactionMessage(
			getCompiledTransactionMessageDecoder().decode(transaction.messageBytes)
		)
	]);

	const signedTransaction = {
		...transaction,
		signatures: { ...transaction.signatures, ...signatures },
		lifetimeConstraint
	};

	// Narrowed rather than cast: each also refuses a transaction that does not meet it.
	assertIsFullySignedTransaction(signedTransaction);
	assertIsTransactionWithinSizeLimit(signedTransaction);
	assertIsTransactionWithBlockhashLifetime(signedTransaction);

	const rowData = toLifiData({ sourceToken, destinationToken, amount });

	if (isNullish(rowData)) {
		throw new Error(get(i18n).swap.error.unexpected);
	}

	// Snapshotted rather than derived at settlement, as for the other providers: the row's terminal
	// analytics report the value the user swapped at.
	const sourceTokenExchangeRate = get(exchanges)?.[sourceToken.id]?.usd;

	const rowId = await createLifiRow({
		identity,
		data: rowData,
		refs: toLifiCreationRefs({
			hash: getSignatureFromTransaction(signedTransaction),
			source: { blockhash: signedTransaction.lifetimeConstraint.blockhash, simulationSlot },
			quote,
			sourceToken,
			destinationToken,
			amount: `${swapAmount}`,
			usdSourceValue: nonNullish(sourceTokenExchangeRate)
				? `${Number(swapAmount) * sourceTokenExchangeRate}`
				: undefined
		})
	});

	try {
		await broadcast(signedTransaction);
	} catch (err: unknown) {
		// Only a refusal no earlier attempt may have relayed shows the transaction was never forwarded.
		if (isSolSendRefusal(err)) {
			await deleteLifiRow({ identity, id: rowId });

			throw err;
		}

		// Any other end may have relayed it. Signing again would sign a new transaction, which could
		// swap twice, so the swap goes on as sent and its row settles it.
		consoleError(err);
	}

	progress(ProgressStepsSwap.UPDATE_UI);

	// The destination token is enabled so it stays visible while the swap settles; the balance
	// refresh happens once the row terminalizes.
	await enableSwapDestinationToken({ destinationToken, identity });
};
