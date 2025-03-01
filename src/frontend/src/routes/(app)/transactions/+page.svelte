<script lang="ts">
	import { isNullish, notEmptyString } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Transactions from '$lib/components/transactions/Transactions.svelte';
	import { NETWORK_PARAM } from '$lib/constants/routes.constants';
	import { networks } from '$lib/derived/networks.derived';

	onMount(async () => {
		// We load the network parameters imperatively because the Svelte $page store might still be uninitialized and undefined at this point.
		const urlParams = new URLSearchParams(window.location.search);
		const routeNetwork = urlParams.get(NETWORK_PARAM);

		// We need to know the network on which the transactions should be loaded.
		// While we can guess the network for ICP, we cannot do the same for ICRC tokens as they are loaded asynchronously.
		// Therefore, we cannot automatically select the network if it is not provided when the component mounts, and we cannot wait indefinitely.
		// That's why, if no network is provided, we route to the root.
		if (isNullish(routeNetwork) || !notEmptyString(routeNetwork)) {
			await goto('/');
		}

		const unknownNetwork =
			$networks.find(({ id }) => id.description === routeNetwork) === undefined;

		if (unknownNetwork) {
			await goto('/');
		}
	});
</script>

<Transactions />
