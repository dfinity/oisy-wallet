<script lang="ts">
	import { goto } from '$app/navigation';
	import WalletConnect from '$eth/components/wallet-connect/WalletConnect.svelte';
	import Alpha from '$lib/components/core/Alpha.svelte';
	import Back from '$lib/components/core/Back.svelte';
	import Menu from '$lib/components/core/Menu.svelte';
	import AboutHowModal from '$lib/components/hero/about/AboutHowModal.svelte';
	import AboutMenu from '$lib/components/hero/about/AboutMenu.svelte';
	import AboutWhatModal from '$lib/components/hero/about/AboutWhatModal.svelte';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import { modalAboutHow, modalAboutWhat } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let back = false;

	const gotoHome = async () => {
		await goto('/');
	};
</script>

<header
	class="grid grid-cols-2 xl:grid-cols-3 items-center md:px-4 relative z-10 pointer-events-none"
	style="min-height: 78px"
>
	{#if back}
		<Back />
	{:else}
		<a
			href="/"
			class="flex p-4 items-center gap-0 pointer-events-auto no-underline"
			aria-label={replaceOisyPlaceholders($i18n.core.alt.go_to_home)}
			on:click={gotoHome}
		>
			<OisyWalletLogo />
		</a>
	{/if}

	<div
		class="col-span-3 col-start-1 row-start-2 xl:col-span-1 xl:col-start-2 xl:row-start-1 flex px-4"
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
