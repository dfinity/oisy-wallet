<script lang="ts">
	import type { ComponentType } from 'svelte';
	import { page } from '$app/stores';
	import Loaders from '$lib/components/core/Loaders.svelte';
	import Modals from '$lib/components/core/Modals.svelte';
	import NoLoaders from '$lib/components/core/NoLoaders.svelte';
	import Hero from '$lib/components/hero/Hero.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { token } from '$lib/stores/token.store';
	import { isRouteSettings, isRouteTransactions } from '$lib/utils/nav.utils';

	let route: 'transactions' | 'tokens' | 'settings' = 'tokens';
	$: route = isRouteSettings($page)
		? 'settings'
		: isRouteTransactions($page)
			? 'transactions'
			: 'tokens';

	$: token.set($pageToken);

	let cmpLoaders: ComponentType;
	$: cmpLoaders = $authSignedIn ? Loaders : NoLoaders;
</script>

<Hero
	usdTotal={route === 'tokens'}
	summary={route === 'transactions'}
	more={route === 'transactions'}
	actions={route !== 'settings'}
/>

<main class="pt-12">
	<svelte:component this={cmpLoaders}>
		<slot />
	</svelte:component>
</main>

<Modals />
