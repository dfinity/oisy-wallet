<script lang="ts">
	import { page } from '$app/stores';
	import AuthGuard from '$lib/components/auth/AuthGuard.svelte';
	import Footer from '$lib/components/core/Footer.svelte';
	import LoadersGuard from '$lib/components/core/LoadersGuard.svelte';
	import Modals from '$lib/components/core/Modals.svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import Header from '$lib/components/hero/Header.svelte';
	import Hero from '$lib/components/hero/Hero.svelte';
	import NavigationMenu from '$lib/components/navigation/NavigationMenu.svelte';
	import SplitPane from '$lib/components/ui/SplitPane.svelte';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { token } from '$lib/stores/token.store';
	import { isRouteDappExplorer, isRouteSettings, isRouteTransactions } from '$lib/utils/nav.utils';

	// TODO: We should consider adding a description for the pages, as this block of code is now appearing in two places.
	// Other areas, like the Menu, are also somewhat disorganized, with navigation logic spread across multiple locations.
	let route: 'transactions' | 'tokens' | 'settings' | 'explore' = 'tokens';
	$: route = isRouteSettings($page)
		? 'settings'
		: isRouteDappExplorer($page)
			? 'explore'
			: isRouteTransactions($page)
				? 'transactions'
				: 'tokens';

	$: token.set($pageToken);
</script>

<div class="absolute top-0"><OisyWalletLogoLink /></div>

<main class="mx-auto flex flex-col gap-y-6 px-5 pt-10 sm:w-sm">
	<slot />
</main>
