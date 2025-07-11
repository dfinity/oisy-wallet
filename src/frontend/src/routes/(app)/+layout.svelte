<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import AuthGuard from '$lib/components/auth/AuthGuard.svelte';
	import Footer from '$lib/components/core/Footer.svelte';
	import Modals from '$lib/components/core/Modals.svelte';
	import DappsCarousel from '$lib/components/dapps/DappsCarousel.svelte';
	import Header from '$lib/components/hero/Header.svelte';
	import Hero from '$lib/components/hero/Hero.svelte';
	import Loaders from '$lib/components/loaders/Loaders.svelte';
	import MobileNavigationMenu from '$lib/components/navigation/MobileNavigationMenu.svelte';
	import NavigationMenu from '$lib/components/navigation/NavigationMenu.svelte';
	import NavigationMenuMainItems from '$lib/components/navigation/NavigationMenuMainItems.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import SplitPane from '$lib/components/ui/SplitPane.svelte';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { token } from '$lib/stores/token.store';
	import { isRouteTokens, isRouteTransactions } from '$lib/utils/nav.utils';

	let tokensRoute: boolean;
	$: tokensRoute = isRouteTokens($page);

	let transactionsRoute: boolean;
	$: transactionsRoute = isRouteTransactions($page);

	let showHero: boolean;
	$: showHero = tokensRoute || transactionsRoute;

	$: token.set($pageToken);

	// Source: https://svelte.dev/blog/view-transitions
	onNavigate((navigation) => {
		if (isNullish(document.startViewTransition)) {
			return;
		}

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<div class:h-dvh={$authNotSignedIn}>
	<div
		class="relative min-h-[640px] pb-5 md:pb-0 lg:flex lg:h-full lg:flex-col"
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
				<NavigationMenu slot="menu">
					{#if tokensRoute}
						<Responsive up="xl">
							<div transition:fade class="hidden xl:block">
								<DappsCarousel />
							</div>
						</Responsive>
					{/if}
				</NavigationMenu>

				{#if showHero}
					<Hero />
				{/if}

				<Loaders>
					<slot />
				</Loaders>
			</SplitPane>

			<MobileNavigationMenu>
				<NavigationMenuMainItems testIdPrefix="mobile" />
			</MobileNavigationMenu>

			<Modals />
		</AuthGuard>

		<Footer />
	</div>
</div>
