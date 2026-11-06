<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet, untrack } from 'svelte';
	import AllUtxosLoader from '$btc/components/fee/AllUtxosLoader.svelte';
	import BtcPendingSentTransactionsLoader from '$btc/components/fee/BtcPendingSentTransactionsLoader.svelte';
	import FeeRatePercentilesLoader from '$btc/components/fee/FeeRatePercentilesLoader.svelte';
	import { DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE } from '$btc/constants/btc.constants';
	import { prepareBtcSend } from '$btc/services/btc-utxos.service';
	import { allUtxosStore } from '$btc/stores/all-utxos.store';
	import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
	import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
	import {
		UTXOS_FEE_CONTEXT_KEY,
		type UtxosFeeContext as UtxosFeeContextType
	} from '$btc/stores/utxos-fee.store';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import type { OptionString } from '$lib/types/string';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		source: string;
		// The recipient, which sizes its output in the fee. Until it is known, the fee is priced
		// for the largest output a send can pay.
		destination?: OptionString;
		amount?: OptionAmount;
		networkId?: NetworkId;
		amountError?: boolean;
		// Optional so the loader can also be mounted beside the content it feeds rather than
		// around it — which is what the swap flow needs, to keep a source-token change from
		// remounting the whole flow along with the loader.
		children?: Snippet;
	}

	let { source, destination, amount, networkId, amountError = false, children }: Props = $props();

	const { store } = getContext<UtxosFeeContextType>(UTXOS_FEE_CONTEXT_KEY);

	let allUtxos = $derived($allUtxosStore?.allUtxos);
	let feeRateFromPercentiles = $derived($feeRatePercentilesStore?.feeRateFromPercentiles);

	const loadEstimatedFee = () => {
		if (isNullish($authIdentity) || isNullish(allUtxos) || isNullish(feeRateFromPercentiles)) {
			return;
		}

		// Only a fee that priced is kept. A failed one may come from data that was missing, like
		// pending transactions whose first load failed and a later one succeeded, so it is priced
		// again whenever this runs. No flow sends with it (`validateBtcSend` refuses it first), so
		// pricing it again cannot change a send under way.
		const keepFee = nonNullish($store?.utxosFee) && isNullish($store.utxosFee.error);

		// If utxos are already known and the new amount is nullish or zero, we keep using the previous fee value
		if (keepFee && (isNullish(amount) || Number(amount) === 0)) {
			return;
		}

		// UTXOs API call is a very time-consuming operation, even though the fees do not change often (no matter what amount is provided)
		// Therefore, to improve UX, we start fetching the fee directly on modal open event
		// Initially, we fetch fees with the default value and then re-fetch it in the background on value change
		const parsedAmount =
			nonNullish(amount) && Number(amount) !== 0
				? Number(amount)
				: DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE;

		// WizardModal re-renders content on step change (e.g. when switching between Convert to Review steps)
		// To avoid re-fetching the fees, we need to check if the amount and the recipient haven't changed
		// since the last request
		if (
			amountError ||
			isNullish(networkId) ||
			isNullishOrEmpty(source) ||
			(keepFee && $store?.amountForFee === parsedAmount && $store.destinationForFee === destination)
		) {
			return;
		}

		if (nonNullish($store?.amountForFee) && Number($store.amountForFee) !== 0) {
			store.reset();
		}

		const utxosFee = prepareBtcSend({
			amount: parsedAmount,
			source,
			destination,
			allUtxos,
			feeRateMiliSatoshisPerVByte: feeRateFromPercentiles
		});

		store.setUtxosFee({
			utxosFee,
			amountForFee: parsedAmount,
			destinationForFee: destination
		});
	};

	$effect(() => {
		[amount, networkId, source, destination];

		if (
			nonNullish($btcPendingSentTransactionsStore[source]) &&
			nonNullish(allUtxos) &&
			nonNullish(feeRateFromPercentiles)
		) {
			untrack(() => loadEstimatedFee());
		}
	});
</script>

<BtcPendingSentTransactionsLoader {networkId} {source}>
	<AllUtxosLoader {networkId} {source}>
		<FeeRatePercentilesLoader {networkId}>
			{@render children?.()}
		</FeeRatePercentilesLoader>
	</AllUtxosLoader>
</BtcPendingSentTransactionsLoader>
