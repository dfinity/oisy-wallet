import { LIFI_BTC_CHANGE_INDEX, LIFI_BTC_SEQUENCE } from '$btc/constants/lifi.constants';
import { sendBtcScriptOutputs, validateBtcSend } from '$btc/services/btc-send.services';
import { btcScriptOutputVSize } from '$btc/utils/btc-psbt.utils';
import {
	isDefinitiveBtcBroadcastRefusal,
	isUnclearBtcBroadcastOutcome
} from '$btc/utils/btc-send.utils';
import { exchanges } from '$lib/derived/exchange.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import {
	createLifiRow,
	deleteLifiRow,
	requoteAtLeast
} from '$lib/services/lifi-swap-execution.services';
import { enableSwapDestinationToken } from '$lib/services/swap.services';
import { i18n } from '$lib/stores/i18n.store';
import type { SwapLifiBtcParams } from '$lib/types/swap';
import { toLifiCreationRefs, toLifiData } from '$lib/utils/lifi-active-tx.utils';
import { decodeLifiBtcTransaction } from '$lib/utils/lifi-swap.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Executes a LI.FI swap from BTC: re-quotes it, rebuilds LI.FI's transaction around the selection the
 * user reviewed, and broadcasts it through the backend. LI.FI's quotes are unsigned, so the quote whose
 * outputs are signed is re-requested, passes the trust checks, and may not guarantee less than the
 * minimum displayed.
 *
 * Only LI.FI's deposit, memo and fee outputs are kept, byte for byte and in LI.FI's order. The inputs,
 * the change and the miner fee are OISY's: LI.FI picks inputs from its own view of the address, which
 * can include ones the backend refuses to spend. The fee is the one reviewed, which must still price
 * the re-quoted layout (`validateBtcSend`).
 *
 * The row is created once the transaction is signed and before it is broadcast, so that no swap is
 * ever broadcast untracked. It is deleted only if the backend refused the broadcast outright. After an
 * unclear outcome it stays, and the poller settles it, as never landed if the network never learns
 * the txid.
 */
export const fetchLifiBtcSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	userAddress,
	network,
	offer,
	utxosFee
}: SwapLifiBtcParams): Promise<void> => {
	const { request } = offer;
	const amount = parseToken({ value: `${swapAmount}`, unitName: sourceToken.decimals });
	const displayedToAmountMin = BigInt(offer.swapDetails.estimate.toAmountMin);

	if (BigInt(request.fromAmount) !== amount || request.fromAddress !== userAddress) {
		throw new Error(get(i18n).swap.error.unexpected);
	}

	progress(ProgressStepsSwap.SWAP);

	const quote = await requoteAtLeast({
		request,
		sourceNetworkId: sourceToken.network.id,
		displayedToAmountMin
	});

	const { deposit, memo, fee } = decodeLifiBtcTransaction({ quote, amount, userAddress });
	const outputs = [deposit, memo, fee];

	// Together the outputs pay the amount: the deposit is the amount less LI.FI's fee.
	await validateBtcSend({
		utxosFee,
		source: userAddress,
		outputVSizes: outputs.map(({ script }) => btcScriptOutputVSize(script)),
		amount: swapAmount,
		network,
		identity
	});

	const rowData = toLifiData({ sourceToken, destinationToken, amount });

	if (isNullish(rowData)) {
		throw new Error(get(i18n).swap.error.unexpected);
	}

	// Snapshotted rather than derived at settlement, as for the other providers: the row's terminal
	// analytics report the value the user swapped at.
	const sourceTokenExchangeRate = get(exchanges)?.[sourceToken.id]?.usd;

	let rowId: string | undefined;

	try {
		await sendBtcScriptOutputs({
			identity,
			network,
			utxosFee,
			source: userAddress,
			layout: { outputs, changeIndex: LIFI_BTC_CHANGE_INDEX, sequence: LIFI_BTC_SEQUENCE },
			beforeBroadcast: async ({ txid }) => {
				rowId = await createLifiRow({
					identity,
					data: rowData,
					refs: toLifiCreationRefs({
						hash: txid,
						quote,
						sourceToken,
						destinationToken,
						amount: `${swapAmount}`,
						usdSourceValue: nonNullish(sourceTokenExchangeRate)
							? `${Number(swapAmount) * sourceTokenExchangeRate}`
							: undefined
					})
				});
			}
		});
	} catch (err: unknown) {
		if (nonNullish(rowId) && isDefinitiveBtcBroadcastRefusal(err)) {
			await deleteLifiRow({ identity, id: rowId });
		}

		// The deposit may have gone out, so the destination is enabled as after a sent one: the swapped
		// asset must not land in a token the user cannot see.
		if (isUnclearBtcBroadcastOutcome(err)) {
			await enableSwapDestinationToken({ destinationToken, identity });
		}

		throw err;
	}

	progress(ProgressStepsSwap.UPDATE_UI);

	// The destination token is enabled so it stays visible while the swap settles; the balance
	// refresh happens once the row terminalizes.
	await enableSwapDestinationToken({ destinationToken, identity });
};
