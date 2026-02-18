<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { EARNING_ENABLED } from '$env/earning';
	import { fetchHarvestVaults } from '$lib/rest/harvest.rest';
	import { harvestVaultsStore } from '$lib/stores/harvest.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	onMount(async () => {
		if (!EARNING_ENABLED) {
			return;
		}

		try {
			const vaults = await fetchHarvestVaults();

			harvestVaultsStore.set(vaults);
		} catch (err: unknown) {
			console.warn('Failed to load Harvest vaults.', err);
		}
	});
</script>

{@render children()}
