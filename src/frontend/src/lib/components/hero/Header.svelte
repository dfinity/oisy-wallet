<script lang="ts">
	import { page } from '$app/stores';
	import AboutWhyOisy from '$lib/components/about/AboutWhyOisy.svelte';
	import AboutWhyOisyModal from '$lib/components/about/AboutWhyOisyModal.svelte';
	import HelpMenu from '$lib/components/core/HelpMenu.svelte';
	import Menu from '$lib/components/core/Menu.svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import DocumentationLink from '$lib/components/navigation/DocumentationLink.svelte';
	import NetworksSwitcher from '$lib/components/networks/NetworksSwitcher.svelte';
	import ThemeSwitchButton from '$lib/components/ui/ThemeSwitchButton.svelte';
	import WalletConnect from '$lib/components/wallet-connect/WalletConnect.svelte';
	import { LANDING_PAGE_ROUTE } from '$lib/constants/analytics.contants';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { modalAboutWhyOisy } from '$lib/derived/modal.derived';
	import { isRouteTransactions } from '$lib/utils/nav.utils';
</script>

<header
	class="z-3 pointer-events-none relative flex w-full max-w-screen-2.5xl items-center justify-between gap-y-5 px-4 pt-6 md:px-8"
	class:1.5xl:fixed={$authSignedIn}
	class:1.5xl:top-0={$authSignedIn}
	class:1.5xl:inset-x-0={$authSignedIn}
	class:1.5xl:z-10={$authSignedIn}
	class:pb-10={$authNotSignedIn}
	class:sm:pb-8={$authNotSignedIn}
>
	<div class="pointer-events-auto">
		<OisyWalletLogoLink />
	</div>

	<div class="pointer-events-auto flex justify-end gap-2 md:gap-5">
		{#if $authSignedIn && !isRouteTransactions($page)}
			<NetworksSwitcher />
		{/if}

		{#if $authSignedIn}
			<WalletConnect />
		{/if}

		{#if $authSignedIn}
			<HelpMenu />

			<Menu />
		{:else}
			<div class="mr-2 flex justify-end gap-3 sm:gap-5 md:mr-0">
				<AboutWhyOisy trackEventSource={LANDING_PAGE_ROUTE} />
				<DocumentationLink shortTextOnMobile trackEventSource={LANDING_PAGE_ROUTE} />
				<ThemeSwitchButton />
				<Menu />
			</div>
		{/if}
	</div>
</header>

{#if $modalAboutWhyOisy}
	<AboutWhyOisyModal />
{/if}
