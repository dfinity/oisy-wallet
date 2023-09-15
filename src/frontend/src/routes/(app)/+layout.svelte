<script lang="ts">
	import Loader from '$lib/components/core/Loader.svelte';
	import Hero from '$lib/hero/Hero.svelte';
	import { isRouteTransactions } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';

	let route: 'transactions' | 'tokens' = 'tokens';
	$: route = isRouteTransactions($page) ? 'transactions' : 'tokens';
</script>

<Hero summary={route === 'transactions'} send={route === 'transactions'} />

<main>
	<Loader>
		<slot />
	</Loader>
</main>
