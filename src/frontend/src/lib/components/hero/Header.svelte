<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { page } from '$app/state';
	import AboutWhyOisy from '$lib/components/about/AboutWhyOisy.svelte';
	import AboutWhyOisyModal from '$lib/components/about/AboutWhyOisyModal.svelte';
	import ActiveUserTransactionsButton from '$lib/components/active-user-transactions/ActiveUserTransactionsButton.svelte';
	import Menu from '$lib/components/core/Menu.svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import DocumentationLink from '$lib/components/navigation/DocumentationLink.svelte';
	import NetworksSwitcher from '$lib/components/networks/NetworksSwitcher.svelte';
	import Scanner from '$lib/components/scanner/Scanner.svelte';
	import ThemeSwitchButton from '$lib/components/ui/ThemeSwitchButton.svelte';
	import WalletConnect from '$lib/components/wallet-connect/WalletConnect.svelte';
	import { LANDING_PAGE_ROUTE } from '$lib/constants/analytics.constants';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import {
		modalAboutWhyOisy,
		modalPayDialogOpen,
		modalUniversalScannerOpen,
		modalWalletConnect
	} from '$lib/derived/modal.derived';
	import { routeCollection } from '$lib/derived/nav.derived';
	import { walletConnectListenerStore } from '$lib/stores/wallet-connect.store';
	import { isRouteNfts, isRouteTransactions } from '$lib/utils/nav.utils';

	// Used to set z-index dynamically (https://github.com/dfinity/oisy-wallet/pull/8340).
	let networkSwitcherOpen = $state(false);
	let menuOpen = $state(false);
	let activeUserTransactionsOpen = $state(false);

	let nftsCollectionRoute = $derived(isRouteNfts(page) && nonNullish($routeCollection));

	let modalsOpen = $derived(
		$modalWalletConnect || $modalUniversalScannerOpen || $modalPayDialogOpen
	);

	// Header-anchored popovers (user menu, network switcher) need the
	// Header's stacking context to outrank sibling `z-10` elements
	// (banners: `Banner`, `PwaBanner`, `AgreementsGuard`, plus
	// `FullscreenMediaModal`). We do NOT bump for modals — gix modals /
	// bottom sheets already paint above the default Header at `z-14`,
	// and bumping here would hide them behind the Header and capture
	// pointer events on top of the modal backdrop. We also keep the
	// signed-in default from `md` (where the Header sticks) at `z-10` so
	// those banners render at the same level as the Header instead of
	// behind it.
	let popoverOpen = $derived(menuOpen || networkSwitcherOpen || activeUserTransactionsOpen);

	let biggerOverlay = $derived(popoverOpen || modalsOpen);

	// When WalletConnect tries to connect, it adds the "Disconnect" label, increasing the width of the header.
	// That causes the screen to expand, without auto-zooming, and the modals overflow outside of the screen.
	// For now, we apply a scale to the header when WalletConnect is trying to connect, to avoid that issue.
	// TODO: remove this condition when we refactor the WalletConnect button to fit
	let isCompact = $derived(nonNullish($walletConnectListenerStore));

	let scrollY = $state(0);

	// From 768 px the header sticks to the top while the page scrolls under it (from 1408 px it
	// is fixed beside the content, as before). At the top of the page nothing is under it, so the
	// band that keeps scrolled rows from showing behind the controls only appears once scrolled.
	let scrolled = $derived($authSignedIn && scrollY > 0);

	// The name keeps the header still between pages, but a named element also confines any
	// `backdrop-filter` inside it to itself: the user menu's backdrop could dim the page and not
	// blur it. So the name is dropped while the user menu is open, the only popover here with a
	// visible backdrop. Its entries close it before the navigation they start, so page changes
	// still find the header named; the network switcher closes only after its navigation, so it
	// must not touch the name.
	let viewTransitionName = $derived(menuOpen ? 'none' : 'header');
</script>

<svelte:window bind:scrollY />

<header
	style:view-transition-name={viewTransitionName}
	class="pointer-events-none relative flex w-full max-w-screen-2.5xl items-center justify-between gap-y-5 px-4 pt-6 md:px-8"
	class:1.5xl:fixed={$authSignedIn}
	class:1.5xl:inset-x-0={$authSignedIn}
	class:flex-wrap={$authNotSignedIn}
	class:md:sticky={$authSignedIn}
	class:md:top-0={$authSignedIn}
	class:md:z-10={$authSignedIn && !popoverOpen}
	class:md:z-20={$authSignedIn && popoverOpen}
	class:pb-10={$authNotSignedIn}
	class:scrolled
	class:sm:pb-8={$authNotSignedIn}
	class:z-20={popoverOpen}
	class:z-3={!biggerOverlay}
	class:z-4={modalsOpen && !popoverOpen}
>
	<div class="pointer-events-auto">
		<OisyWalletLogoLink />
	</div>

	<div
		class="pointer-events-auto flex justify-end"
		class:gap-1={isCompact}
		class:gap-2={!isCompact}
		class:max-w-full={isCompact}
		class:md:gap-2={isCompact}
		class:md:gap-3={!isCompact}
		class:scale-70={isCompact}
		class:xs:max-w-none={isCompact}
		class:xs:scale-none={isCompact}
	>
		{#if $authSignedIn && !isRouteTransactions(page) && !nftsCollectionRoute}
			<NetworksSwitcher bind:visible={networkSwitcherOpen} />
		{/if}

		{#if $authSignedIn}
			{#if nonNullish($walletConnectListenerStore)}
				<WalletConnect />
			{/if}

			<ActiveUserTransactionsButton bind:visible={activeUserTransactionsOpen} />

			<Scanner />
		{/if}

		{#if $authSignedIn}
			<Menu bind:visible={menuOpen} />
		{:else}
			<div class="flex flex-wrap items-center justify-end gap-2 sm:gap-5">
				<AboutWhyOisy trackEventSource={LANDING_PAGE_ROUTE} />
				<DocumentationLink shortTextOnMobile trackEventSource={LANDING_PAGE_ROUTE} />
				<ThemeSwitchButton />
				<Menu bind:visible={menuOpen} />
			</div>
		{/if}
	</div>
</header>

{#if $modalAboutWhyOisy}
	<AboutWhyOisyModal />
{/if}

<style lang="scss">
	// Between 768 px and 68rem (1088 px) even the compact controls sit over the content column,
	// so scrolled rows would show through behind them: a band in the page colour covers them.
	// From 68rem the controls clear the content and the header stays transparent, as from 1408 px.
	// Same range as the `header-band:` variant in global.scss, which pinned section headers
	// (`StickyHeader`) use to pin below the band; change both together.
	@media (min-width: 48rem) and (max-width: 67.99rem) {
		header::before {
			content: '';
			position: absolute;
			inset: 0 0 -0.75rem;
			z-index: -1;
			background: color-mix(in srgb, var(--color-background-page) 85%, transparent);
			backdrop-filter: blur(12px);
			opacity: 0;
			transition: opacity 0.15s ease-out;
		}

		header.scrolled::before {
			opacity: 1;
		}
	}
</style>
