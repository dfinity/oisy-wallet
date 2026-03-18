<script lang="ts">
	import { onMount } from 'svelte';
	import { EARNING_ENABLED } from '$env/earning';
	import { fetchHarvestVaults } from '$lib/rest/harvest.rest';
	import { harvestVaultsStore } from '$lib/stores/harvest.store';
	import { consoleWarn } from '$lib/utils/console.utils';

	onMount(async () => {
		if (!EARNING_ENABLED) {
			return;
		}

		try {
			const vaults = await fetchHarvestVaults();

			harvestVaultsStore.set(vaults);
		} catch (err: unknown) {
			consoleWarn('Failed to load Harvest vaults.', err);
		}
	});
</script>
