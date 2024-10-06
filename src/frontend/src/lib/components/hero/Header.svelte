<script lang="ts">
	import { page } from '$app/stores';
	import WalletConnect from '$eth/components/wallet-connect/WalletConnect.svelte';
	import Back from '$lib/components/core/Back.svelte';
	import Menu from '$lib/components/core/Menu.svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import HeroSignIn from '$lib/components/hero/HeroSignIn.svelte';
	import NavigationBar from '$lib/components/hero/NavigationBar.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import { isRouteSettings } from '$lib/utils/nav.utils';

	let isSettings = false;
	$: isSettings = isRouteSettings($page);
</script>

<header
	class="z-1 relative grid grid-cols-[1fr_auto_1fr] items-center gap-5 border-b border-b-grey p-4 sm:px-8"
>
	{#if isSettings}
		<Back />
	{:else}
		<OisyWalletLogoLink />
	{/if}

	<NavigationBar />

	<div class="flex justify-end gap-4">
		{#if $authSignedIn}
			<WalletConnect />
			<Menu />
		{:else}
			<HeroSignIn />
		{/if}
	</div>
</header>
