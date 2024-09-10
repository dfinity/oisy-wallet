<script lang="ts">
	import Hero from '$lib/components/hero/Hero.svelte';
	import { isRouteSettings, isRouteTransactions } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import Modals from '$lib/components/core/Modals.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { token } from '$lib/stores/token.store';
	import LoadersGuard from '$lib/components/core/LoadersGuard.svelte';

	let route: 'transactions' | 'tokens' | 'settings' = 'tokens';
	$: route = isRouteSettings($page)
		? 'settings'
		: isRouteTransactions($page)
			? 'transactions'
			: 'tokens';

	$: token.set($pageToken);
</script>

<Hero
	usdTotal={route === 'tokens'}
	summary={route === 'transactions'}
	more={route === 'transactions'}
	actions={route !== 'settings'}
/>

<main class="pt-12">
	<LoadersGuard>
		<slot />
	</LoadersGuard>
</main>

<Modals />
