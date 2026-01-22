<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet, untrack } from 'svelte';
	import AllUtxosLoader from '$btc/components/fee/AllUtxosLoader.svelte';
	import FeeRatePercentilesLoader from '$btc/components/fee/FeeRatePercentilesLoader.svelte';
	import { DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE } from '$btc/constants/btc.constants';
	import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
	import { prepareBtcSend } from '$btc/services/btc-utxos.service';
	import {
		ALL_UTXOS_CONTEXT_KEY,
		type AllUtxosContext as AllUtxosContextType
	} from '$btc/stores/all-utxos.store';
	import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
	import {
		FEE_RATE_PERCENTILES_CONTEXT_KEY,
		type FeeRatePercentilesContext as FeeRatePercentilesContextType
	} from '$btc/stores/fee-rate-percentiles.store';
	import {
		UTXOS_FEE_CONTEXT_KEY,
		type UtxosFeeContext as UtxosFeeContextType
	} from '$btc/stores/utxos-fee.store';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		source: string;
		amount?: OptionAmount;
		networkId?: NetworkId;
		amountError?: boolean;
		children: Snippet;
	}

	let { source, amount, networkId, amountError = false, children }: Props = $props();

	const { store } = getContext<UtxosFeeContextType>(UTXOS_FEE_CONTEXT_KEY);

	const { store: allUtxosStore } = getContext<AllUtxosContextType>(ALL_UTXOS_CONTEXT_KEY);

	const { store: feeRatePercentilesStore } = getContext<FeeRatePercentilesContextType>(
		FEE_RATE_PERCENTILES_CONTEXT_KEY
	);

	let allUtxos = $derived($allUtxosStore?.allUtxos);
	let feeRateFromPercentiles = $derived($feeRatePercentilesStore?.feeRateFromPercentiles);

	const loadEstimatedFee = () => {
		if (isNullish($authIdentity) || isNullish(allUtxos) || isNullish(feeRateFromPercentiles)) {
			return;
		}

		// If utxos are already known and the new amount is nullish or zero, we keep using the previous fee value
		if (nonNullish($store?.utxosFee) && (isNullish(amount) || Number(amount) === 0)) {
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
		// To avoid re-fetching the fees, we need to check if the amount hasn't changed since the last request
		if (
			amountError ||
			isNullish(networkId) ||
			isNullishOrEmpty(source) ||
			(nonNullish($store) && $store.amountForFee === parsedAmount)
		) {
			return;
		}

		if (nonNullish($store?.amountForFee) && Number($store.amountForFee) !== 0) {
			store.reset();
		}

		const utxosFee = prepareBtcSend({
			amount: parsedAmount,
			source,
			allUtxos,
			feeRateMiliSatoshisPerVByte: feeRateFromPercentiles
		});

		store.setUtxosFee({
			utxosFee,
			amountForFee: parsedAmount
		});
	};

	$effect(() => {
		[networkId, source];

		untrack(() =>
			loadBtcPendingSentTransactions({
				identity: $authIdentity,
				networkId,
				address: source
			})
		);
	});

	$effect(() => {
		[amount, networkId, source];

		if (
			nonNullish($btcPendingSentTransactionsStore[source]) &&
			nonNullish(allUtxos) &&
			nonNullish(feeRateFromPercentiles)
		) {
			untrack(() => loadEstimatedFee());
		}
	});
</script>

<AllUtxosLoader {networkId} {source}>
	<FeeRatePercentilesLoader {networkId}>
		{@render children()}
	</FeeRatePercentilesLoader>
</AllUtxosLoader>
