<script lang="ts">
	import AboutWhyOisy from '$lib/components/about/AboutWhyOisy.svelte';
	import AboutWhyOisyModal from '$lib/components/about/AboutWhyOisyModal.svelte';
	import Menu from '$lib/components/core/Menu.svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import DocumentationLink from '$lib/components/navigation/DocumentationLink.svelte';
	import ThemeSwitchButton from '$lib/components/ui/ThemeSwitchButton.svelte';
	import WalletConnect from '$lib/components/wallet-connect/WalletConnect.svelte';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { modalAboutWhyOisy } from '$lib/derived/modal.derived';
</script>

<header
	class="z-1 pointer-events-none relative flex w-full max-w-screen-2.5xl items-center justify-between gap-y-5 px-4 pt-6 md:px-8"
	class:lg:fixed={$authSignedIn}
	class:lg:top-0={$authSignedIn}
	class:lg:inset-x-0={$authSignedIn}
	class:lg:z-10={$authSignedIn}
	class:pb-10={$authNotSignedIn}
	class:sm:pb-8={$authNotSignedIn}
>
	<div class="pointer-events-auto">
		<OisyWalletLogoLink />
	</div>

	<div class="pointer-events-auto flex justify-end gap-5">
		{#if $authSignedIn}
			<ThemeSwitchButton />
			<WalletConnect />
		{/if}

		{#if $authSignedIn}
			<Menu />
		{:else}
			<div class="mr-2 flex justify-end gap-5 md:mr-0">
				<AboutWhyOisy />
				<DocumentationLink />
				<ThemeSwitchButton />
			</div>
		{/if}
	</div>
</header>

{#if $modalAboutWhyOisy}
	<AboutWhyOisyModal />
{/if}
