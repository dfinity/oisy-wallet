<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import {
		ALL_UTXOS_CONTEXT_KEY,
		type AllUtxosContext as AllUtxosContextType,
		initAllUtxosStore
	} from '$btc/stores/all-utxos.store';
	import {
		FEE_RATE_PERCENTILES_CONTEXT_KEY,
		type FeeRatePercentilesContext as FeeRatePercentilesContextType,
		initFeeRatePercentilesStore
	} from '$btc/stores/fee-rate-percentiles.store';
	import {
		UTXOS_FEE_CONTEXT_KEY,
		type UtxosFeeContext as UtxosFeeContextType,
		initUtxosFeeStore
	} from '$btc/stores/utxos-fee.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	setContext<AllUtxosContextType>(ALL_UTXOS_CONTEXT_KEY, {
		store: initAllUtxosStore()
	});

	setContext<FeeRatePercentilesContextType>(FEE_RATE_PERCENTILES_CONTEXT_KEY, {
		store: initFeeRatePercentilesStore()
	});

	setContext<UtxosFeeContextType>(UTXOS_FEE_CONTEXT_KEY, {
		store: initUtxosFeeStore()
	});
</script>

{@render children()}
