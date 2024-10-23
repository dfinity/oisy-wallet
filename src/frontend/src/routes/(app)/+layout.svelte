<script lang="ts">
	import { page } from '$app/stores';
	import AuthGuard from '$lib/components/auth/AuthGuard.svelte';
	import Footer from '$lib/components/core/Footer.svelte';
	import LoadersGuard from '$lib/components/core/LoadersGuard.svelte';
	import Modals from '$lib/components/core/Modals.svelte';
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

<div
	class="relative min-h-[640px] lg:flex lg:h-full lg:flex-col"
	class:overflow-hidden={$authNotSignedIn}
	class:flex={$authSignedIn}
	class:h-full={$authSignedIn}
	class:flex-col={$authSignedIn}
	class:md:flex={$authNotSignedIn}
	class:md:flex-col={$authNotSignedIn}
	class:md:h-full={$authNotSignedIn}
>
	<Header />

	<AuthGuard>
		<SplitPane>
			<NavigationMenu slot="menu" />

			{#if route !== 'settings' && route !== 'explore'}
				<Hero
					usdTotal={route === 'tokens'}
					summary={route === 'transactions'}
					back={route === 'transactions'}
				/>
			{/if}

			<LoadersGuard>
				<slot />
			</LoadersGuard>
		</SplitPane>

		<Modals />
	</AuthGuard>

	<Footer />
</div>
