<script lang="ts">
	import WalletConnect from '$eth/components/wallet-connect/WalletConnect.svelte';
	import Alpha from '$lib/components/core/Alpha.svelte';
	import Back from '$lib/components/core/Back.svelte';
	import Menu from '$lib/components/core/Menu.svelte';
	import AboutHowModal from '$lib/components/hero/about/AboutHowModal.svelte';
	import AboutMenu from '$lib/components/hero/about/AboutMenu.svelte';
	import AboutWhatModal from '$lib/components/hero/about/AboutWhatModal.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import { modalAboutHow, modalAboutWhat } from '$lib/derived/modal.derived';

	export let back = false;

	let mw: 'sm' | 'xl';
	$: mw = $authSignedIn ? 'sm' : 'xl';
</script>

<header
	class={`grid grid-cols-2 ${mw}:grid-cols-[1fr_auto_1fr] items-center md:px-4 relative z-10 pointer-events-none`}
	style="min-height: 78px"
>
	{#if back}
		<Back />
	{:else}
		<div class="flex p-4 items-center">
			<OisyWalletLogo />
		</div>
	{/if}

	<div
		class={`col-span-3 col-start-1 row-start-2 ${mw}:col-span-1 ${mw}:col-start-2 ${mw}:row-start-1 ${mw}:w-fit flex px-4`}
	>
		<Alpha />
	</div>

	<div class="flex m-4 gap-4 pointer-events-auto ml-auto">
		{#if $authSignedIn}
			<WalletConnect />
		{/if}

		{#if $authSignedIn}
			<Menu />
		{:else}
			<AboutMenu />
		{/if}
	</div>
</header>

{#if $modalAboutWhat}
	<AboutWhatModal />
{:else if $modalAboutHow}
	<AboutHowModal />
{/if}
