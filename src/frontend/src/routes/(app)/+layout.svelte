<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import AiAssistantConsoleButton from '$lib/components/ai-assistant/AiAssistantConsoleButton.svelte';
	import AuthGuard from '$lib/components/auth/AuthGuard.svelte';
	import LockPage from '$lib/components/auth/LockPage.svelte';
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
	import { isAuthLocked } from '$lib/derived/locked.derived';
	import { routeCollection } from '$lib/derived/nav.derived';
	import { pageNonFungibleToken, pageToken } from '$lib/derived/page-token.derived';
	import { token } from '$lib/stores/token.store';
	import { isRouteNfts, isRouteTokens, isRouteTransactions } from '$lib/utils/nav.utils';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let tokensRoute = $derived(isRouteTokens(page));

	let nftsRoute = $derived(isRouteNfts(page));
	let nftsCollectionRoute = $derived(isRouteNfts(page) && nonNullish($routeCollection));

	let transactionsRoute = $derived(isRouteTransactions(page));

	let showHero = $derived((tokensRoute || nftsRoute || transactionsRoute) && !nftsCollectionRoute);

	$effect(() => {
		token.set(nftsCollectionRoute ? ($pageNonFungibleToken ?? $pageToken) : $pageToken); // we could be on the nfts page without a pageNonFungibleToken set
	});

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

{#if $isAuthLocked}
	<LockPage />
{:else}
	<div class:h-dvh={$authNotSignedIn}>
		<div class="relative flex h-full min-h-[100dvh] flex-col overflow-x-hidden pb-5 md:pb-0">
			<Header />

			<AuthGuard>
				<SplitPane>
					{#snippet menu()}
						<NavigationMenu>
							{#if tokensRoute || nftsRoute}
								<Responsive up="xl">
									<div class="hidden xl:block" transition:fade>
										<DappsCarousel />
									</div>
								</Responsive>
							{/if}
						</NavigationMenu>
					{/snippet}

					{#if showHero}
						<Hero />
					{/if}

					<Loaders>
						{@render children()}
					</Loaders>
				</SplitPane>

				<Responsive down="md">
					<div class="z-2 fixed bottom-16 right-2 block md:hidden">
						<AiAssistantConsoleButton styleClass="mb-2" />
					</div>
				</Responsive>

				<MobileNavigationMenu>
					<NavigationMenuMainItems testIdPrefix="mobile" />
				</MobileNavigationMenu>

				<Modals />
			</AuthGuard>

			<Footer />
		</div>
	</div>
{/if}
