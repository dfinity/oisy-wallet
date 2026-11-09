<script lang="ts">
	import type { Readable } from 'svelte/store';
	import UtxosFeeLoader from '$btc/components/fee/UtxosFeeLoader.svelte';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionString } from '$lib/types/string';

	// The recipient comes from a store, so a test can change it alone. `rerender` replaces every prop
	// at once, which reruns any effect that reads one, whatever it tracks.
	interface Props {
		source: string;
		amount: number;
		networkId: NetworkId;
		destination: Readable<OptionString>;
	}

	let { source, amount, networkId, destination }: Props = $props();
</script>

<UtxosFeeLoader {amount} destination={$destination} {networkId} {source} />
