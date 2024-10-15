<script lang="ts">
	import WalletConnect from '$eth/components/wallet-connect/WalletConnect.svelte';
	import SignIn from '$lib/components/auth/SignIn.svelte';
	import Alpha from '$lib/components/core/Alpha.svelte';
	import Back from '$lib/components/core/Back.svelte';
	import Menu from '$lib/components/core/Menu.svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import AboutHowModal from '$lib/components/hero/about/AboutHowModal.svelte';
	import AboutMenu from '$lib/components/hero/about/AboutMenu.svelte';
	import AboutWhatModal from '$lib/components/hero/about/AboutWhatModal.svelte';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { modalAboutHow, modalAboutWhat } from '$lib/derived/modal.derived';

	export let back = false;
</script>

<header
	class="z-1 relative grid w-full max-w-screen-2.5xl grid-cols-2 items-center gap-y-5 px-4 pt-6 sm:px-8"
	class:xl:grid-cols-[1fr_auto_1fr]={$authNotSignedIn}
>
	{#if back}
		<Back />
	{:else}
		<OisyWalletLogoLink />
	{/if}

	{#if $authNotSignedIn}
		<div
			class="col-span-3 col-start-1 row-start-2 flex xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:w-fit"
		>
			<Alpha />
		</div>
	{/if}

	<div class="flex justify-end gap-4">
		{#if $authSignedIn}
			<WalletConnect />
		{/if}

		{#if $authSignedIn}
			<Menu />
		{:else}
			<AboutMenu />

			<SignIn />
		{/if}
	</div>
</header>

{#if $modalAboutWhat}
	<AboutWhatModal />
{:else if $modalAboutHow}
	<AboutHowModal />
{/if}
