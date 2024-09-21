<script lang="ts">
	import WalletConnect from '$eth/components/wallet-connect/WalletConnect.svelte';
	import Alpha from '$lib/components/core/Alpha.svelte';
	import Back from '$lib/components/core/Back.svelte';
	import Menu from '$lib/components/core/Menu.svelte';
	import AboutHowModal from '$lib/components/hero/about/AboutHowModal.svelte';
	import AboutMenu from '$lib/components/hero/about/AboutMenu.svelte';
	import AboutWhatModal from '$lib/components/hero/about/AboutWhatModal.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { modalAboutHow, modalAboutWhat } from '$lib/derived/modal.derived';

	export let back = false;
</script>

<header
	class="grid grid-cols-2 items-center md:px-4 relative z-10 pointer-events-none"
	class:sm:grid-cols-[1fr_auto_1fr]={$authSignedIn}
	class:xl:grid-cols-[1fr_auto_1fr]={$authNotSignedIn}
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
		class="col-span-3 col-start-1 row-start-2 flex px-4"
		class:sm:col-span-1={$authSignedIn}
		class:xl:col-span-1={$authNotSignedIn}
		class:sm:col-start-2={$authSignedIn}
		class:xl:col-start-2={$authNotSignedIn}
		class:sm:row-start-1={$authSignedIn}
		class:xl:row-start-1={$authNotSignedIn}
		class:sm:w-fit={$authSignedIn}
		class:xl:w-fit={$authNotSignedIn}
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
