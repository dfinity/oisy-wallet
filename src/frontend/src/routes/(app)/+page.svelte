<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import Tokens from '$lib/components/tokens/Tokens.svelte';
	import { routeNetwork } from '$lib/derived/nav.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { selectedNetworkStore } from '$lib/stores/settings.store';
	import { switchNetwork } from '$lib/utils/nav.utils';

	onMount(async () => {
		const savedSelectedNetwork = $selectedNetworkStore?.option;

		// switch to saved selected network only if it's not already available as URL param
		if (nonNullish(savedSelectedNetwork) && isNullish($routeNetwork)) {
			const network = $networks.find(({ id }) => id.description === savedSelectedNetwork);

			if (nonNullish(network)) {
				await switchNetwork(network.id);
			}
		}
	});
</script>

<Tokens />
