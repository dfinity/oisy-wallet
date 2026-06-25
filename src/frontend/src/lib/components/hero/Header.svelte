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
	// `1.5xl` signed-in default at `z-10` so those banners render at
	// the same level as the Header instead of behind it.
	let popoverOpen = $derived(menuOpen || networkSwitcherOpen || activeUserTransactionsOpen);

	let biggerOverlay = $derived(popoverOpen || modalsOpen);

	// When WalletConnect tries to connect, it adds the "Disconnect" label, increasing the width of the header.
	// That causes the screen to expand, without auto-zooming, and the modals overflow outside of the screen.
	// For now, we apply a scale to the header when WalletConnect is trying to connect, to avoid that issue.
	// TODO: remove this condition when we refactor the WalletConnect button to fit
	let isCompact = $derived(nonNullish($walletConnectListenerStore));
</script>

<header
	style="view-transition-name: header"
	class="pointer-events-none relative flex w-full max-w-screen-2.5xl items-center justify-between gap-y-5 px-4 pt-6 md:px-8"
	class:1.5xl:fixed={$authSignedIn}
	class:1.5xl:inset-x-0={$authSignedIn}
	class:1.5xl:top-0={$authSignedIn}
	class:1.5xl:z-10={$authSignedIn && !popoverOpen}
	class:1.5xl:z-20={$authSignedIn && popoverOpen}
	class:pb-10={$authNotSignedIn}
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
			<div class="mr-2 flex justify-end gap-3 sm:gap-5 md:mr-0">
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
