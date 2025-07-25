<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import AiAssistantConsole from '$lib/components/ai-assistant/AiAssistantConsole.svelte';
	import AiAssistantConsoleButton from '$lib/components/ai-assistant/AiAssistantConsoleButton.svelte';
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
	import { aiAssistantConsoleOpen } from '$lib/derived/ai-assistant.derived';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { token } from '$lib/stores/token.store';
	import { isRouteTokens, isRouteTransactions } from '$lib/utils/nav.utils';
	import type {Snippet} from "svelte";

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let tokensRoute = $derived(isRouteTokens(page));

	let transactionsRoute = $derived(isRouteTransactions(page));

	let showHero = $derived(tokensRoute || transactionsRoute);

	$effect(() => {
		token.set($pageToken);
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
				{#snippet menu()}
					<NavigationMenu>
						{#if tokensRoute}
							<Responsive up="xl">
								<div transition:fade class="hidden xl:block">
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
					<AiAssistantConsoleButton styleClass="mb-2" size="60" />
				</div>
			</Responsive>

			<MobileNavigationMenu>
				<NavigationMenuMainItems testIdPrefix="mobile" />
			</MobileNavigationMenu>

			<Modals />
		</AuthGuard>

		{#if $aiAssistantConsoleOpen}
			<AiAssistantConsole />
		{:else}
			<Footer />
		{/if}
	</div>
</div>
