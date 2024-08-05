<script lang="ts">
	import Menu from '$lib/components/core/Menu.svelte';
	import WalletConnect from '$eth/components/wallet-connect/WalletConnect.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { page } from '$app/stores';
	import Back from '$lib/components/core/Back.svelte';
	import { isSubRoute } from '$lib/utils/nav.utils';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import AboutMenu from '$lib/components/hero/about/AboutMenu.svelte';
	import { modalAboutHow, modalAboutWhat } from '$lib/derived/modal.derived';
	import AboutWhatModal from '$lib/components/hero/about/AboutWhatModal.svelte';
	import AboutHowModal from '$lib/components/hero/about/AboutHowModal.svelte';

	let back = false;
	$: back = isSubRoute($page);
</script>

<header
	class="flex justify-between md:px-4 relative z-10 pointer-events-none"
	style="min-height: 78px"
>
	{#if back}
		<Back />
	{:else}
		<div class="flex p-4 items-center text-off-white">
			<OisyWalletLogo />
			{#if $authNotSignedIn}
				<div
					class="absolute max-w-[3rem] leading-none text-[8px] uppercase font-semibold translate-x-[112%] translate-y-[130%] hidden md:flex"
				>
					{$i18n.hero.text.never_download}
				</div>
			{/if}
		</div>
	{/if}

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
