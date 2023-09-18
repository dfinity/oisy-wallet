<script lang="ts">
	import Loader from '$lib/components/core/Loader.svelte';
	import Hero from '$lib/hero/Hero.svelte';
	import { isRouteTransactions } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import AirdropButton from '$lib/components/airdrop/AirdropButton.svelte';

	let route: 'transactions' | 'tokens' = 'tokens';
	$: route = isRouteTransactions($page) ? 'transactions' : 'tokens';
</script>

<Hero summary={route === 'transactions'} send={route === 'transactions'} />

<main>
	<Loader>
		<AirdropButton />

		<slot />
	</Loader>
</main>
