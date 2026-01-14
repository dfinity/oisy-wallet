<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { type Snippet, untrack } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { icrcAccount } from '$icp/derived/ic.derived';
	import { isUserMintingAccount } from '$icp/services/icrc-minting.services';
	import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
	import { isTokenIc } from '$icp/utils/icrc.utils';
	import AiAssistantConsoleButton from '$lib/components/ai-assistant/AiAssistantConsoleButton.svelte';
	import AuthGuard from '$lib/components/auth/AuthGuard.svelte';
	import LockPage from '$lib/components/auth/LockPage.svelte';
	import Footer from '$lib/components/core/Footer.svelte';
	import InternetIdentityBanner from '$lib/components/core/InternetIdentityBanner.svelte';
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
	import { authNotSignedIn, authSignedIn, authIdentity } from '$lib/derived/auth.derived';
	import { isAuthLocked } from '$lib/derived/locked.derived';
	import { routeCollection } from '$lib/derived/nav.derived';
	import { pageNonFungibleToken, pageToken } from '$lib/derived/page-token.derived';
	import { token } from '$lib/stores/token.store';
	import {
		isRouteEarning,
		isRouteNfts,
		isRouteTokens,
		isRouteTransactions
	} from '$lib/utils/nav.utils';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let tokensRoute = $derived(isRouteTokens(page));

	let nftsRoute = $derived(isRouteNfts(page));
	let nftsCollectionRoute = $derived(isRouteNfts(page) && nonNullish($routeCollection));

	let earningRoute = $derived(isRouteEarning(page));

	let assetsRoute = $derived(tokensRoute || nftsRoute || earningRoute);

	let transactionsRoute = $derived(isRouteTransactions(page));

	let showHero = $derived((assetsRoute || transactionsRoute) && !nftsCollectionRoute);

	$effect(() => {
		token.set(nftsCollectionRoute ? ($pageNonFungibleToken ?? $pageToken) : $pageToken); // we could be on the nfts page without a pageNonFungibleToken set
	});

	const updateIcMintingAccountStatus = async () => {
		try {
			const isMintingAccount =
				transactionsRoute && nonNullish($pageToken) && isTokenIc($pageToken)
					? await isUserMintingAccount({
							identity: $authIdentity,
							account: $icrcAccount,
							token: $pageToken
						})
					: false;

			isIcMintingAccount.set(isMintingAccount);
		} catch (_: unknown) {
			isIcMintingAccount.set(false);
		}
	};

	$effect(() => {
		[$authIdentity, $icrcAccount, $pageToken, transactionsRoute];

		untrack(() => updateIcMintingAccountStatus());
	});

	// Source: https://svelte.dev/blog/view-transitions
	onNavigate((navigation) => {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore -- The ViewTransition api is still a "Candidate recommendation", so it's not embedded in TSs' definition yet
		if (isNullish(document.startViewTransition)) {
			return;
		}

		return new Promise((resolve) => {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore -- The ViewTransition api is still a "Candidate recommendation", so it's not embedded in TSs' definition yet
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
		<div
			class="relative flex flex-col pb-5 md:pb-0"
			class:h-full={$authSignedIn}
			class:min-h-[100dvh]={$authNotSignedIn}
			class:overflow-x-hidden={$authNotSignedIn}
		>
			{#if $authNotSignedIn}
				<InternetIdentityBanner />
			{/if}

			<Header />

			<AuthGuard>
				<SplitPane>
					{#snippet menu()}
						<NavigationMenu>
							{#if assetsRoute}
								<Responsive up="1.5xl">
									<DappsCarousel />
								</Responsive>
							{/if}
						</NavigationMenu>
					{/snippet}

					{#if showHero}
						<Hero />
					{/if}

					<Loaders>
						{#if assetsRoute}
							<Responsive down="xl">
								<DappsCarousel wrapperStyleClass="mb-6 flex justify-center xl:hidden" />
							</Responsive>
						{/if}

						{@render children()}
					</Loaders>
				</SplitPane>

				{#if !$aiAssistantConsoleOpen}
					<div class="fixed right-4 bottom-16 z-2 block">
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
