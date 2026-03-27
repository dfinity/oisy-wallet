<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import {
		UTXOS_FEE_CONTEXT_KEY,
		type UtxosFeeContext as UtxosFeeContextType,
		initUtxosFeeStore
	} from '$btc/stores/utxos-fee.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	setContext<UtxosFeeContextType>(UTXOS_FEE_CONTEXT_KEY, {
		store: initUtxosFeeStore()
	});
</script>

{@render children()}
