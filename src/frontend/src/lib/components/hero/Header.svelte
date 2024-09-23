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
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let back = false;
</script>

<header
	class="grid grid-cols-2 items-center px-4 sm:px-8 relative z-10 pointer-events-none gap-y-5"
	class:sm:grid-cols-[1fr_auto_1fr]={$authSignedIn}
	class:xl:grid-cols-[1fr_auto_1fr]={$authNotSignedIn}
>
	{#if back}
		<Back />
	{:else}
		<a
			href="/"
			class="flex items-center gap-0 pointer-events-auto no-underline"
			aria-label={replaceOisyPlaceholders($i18n.core.alt.go_to_home)}
		>
			<OisyWalletLogo />
		</a>
	{/if}

	<div
		class="col-span-3 col-start-1 row-start-2 flex"
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

	<div class="flex gap-4 pointer-events-auto ml-auto">
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
