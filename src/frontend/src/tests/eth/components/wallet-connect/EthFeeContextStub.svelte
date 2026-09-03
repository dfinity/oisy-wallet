<script lang="ts" module>
	import { writable } from 'svelte/store';
	import type { EthFeePriority } from '$lib/enums/eth-fee-priority';

	// Records what the modal hands the fee context, so the wiring can be asserted without standing
	// up the provider, the gas API and the listener the real context needs.
	export const observedPriority = writable<EthFeePriority | undefined>(undefined);
</script>

<script lang="ts">
	interface Props {
		priority?: EthFeePriority;
	}

	let { priority }: Props = $props();

	$effect(() => {
		observedPriority.set(priority);
	});
</script>
