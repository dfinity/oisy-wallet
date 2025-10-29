<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
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
	import { aiAssistantConsoleOpen } from '$lib/derived/ai-assistant.derived';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { isAuthLocked } from '$lib/derived/locked.derived';
	import { routeCollection } from '$lib/derived/nav.derived';
	import { pageNonFungibleToken, pageToken } from '$lib/derived/page-token.derived';
	import { modalStore } from '$lib/stores/modal.store';
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

	onMount(() => {
		let focused = false;

		const disableTouch = (e: TouchEvent) => {
			if (focused) {
				e.preventDefault();
			}
		};

		const onFocusIn = (e: FocusEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				focused = true;
				document.body.style.touchAction = 'none'; // disables touch gestures
				document.body.style.overflow = 'hidden'; // as a backup for Android
			}
		};

		const onFocusOut = () => {
			focused = false;
			document.body.style.touchAction = '';
			document.body.style.overflow = '';
		};

		document.addEventListener('focusin', onFocusIn);
		document.addEventListener('focusout', onFocusOut);
		document.addEventListener('touchmove', disableTouch, { passive: false });

		return () => {
			document.removeEventListener('focusin', onFocusIn);
			document.removeEventListener('focusout', onFocusOut);
			document.removeEventListener('touchmove', disableTouch);
		};
	});
</script>

{#if $isAuthLocked}
	<LockPage />
{:else}
	<div class:h-dvh={$authNotSignedIn}>
		<div
			class="relative flex flex-col pb-5 md:pb-0"
			class:h-full={$authSignedIn}
			class:min-h-[100dvh]={$authNotSignedIn}
		>
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

				{#if !$aiAssistantConsoleOpen}
					<div class="fixed right-4 bottom-16 z-3 block">
						<AiAssistantConsoleButton styleClass="mb-2" />
					</div>
				{/if}

				<MobileNavigationMenu>
					<NavigationMenuMainItems testIdPrefix="mobile" />
				</MobileNavigationMenu>

				<Modals />
			</AuthGuard>

			<Footer />
		</div>
	</div>
{/if}
