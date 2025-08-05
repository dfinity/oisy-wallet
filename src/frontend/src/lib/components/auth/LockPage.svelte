<script lang="ts">
	import { themeStore } from '@dfinity/gix-components';
	import Img from '$lib/components/ui/Img.svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const ariaLabel = $derived(replaceOisyPlaceholders($i18n.auth.alt.preview));

	function handleUnlock() {
		console.log('Unlock clicked');
	}

	function handleLogout() {
		console.log('Logout clicked');
	}
</script>

<style>
	.background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: url('/assets/1440.png') no-repeat center center fixed;
		background-size: cover;
		z-index: -1;
	}
</style>

<div class="background"></div>

<div class="flex h-screen items-center justify-center px-4">
	<div
	class="flex w-full max-w-md flex-col content-center items-center justify-center rounded-[24px] bg-[var(--color-background-surface)] p-6 text-center text-[var(--color-text-primary)] shadow-lg transition-all duration-500 ease-in-out md:rounded-[28px] md:p-8" >
		<div class="mb-6">
			<div class="pointer-events-auto">
				<OisyWalletLogoLink />
			</div>
		</div>

		<h2 class="text-2xl font-semibold mb-2">Wallet locked</h2>
		<p class="mb-6 text-gray-600">Unlock to continue in OISY</p>

		<Button fullWidth styleClass="w-full mb-3" onclick={handleUnlock}>
			Unlock 
		</Button>

		<Button fullWidth colorStyle="secondary-light" class="w-full" onclick={handleLogout}>
			Log out 
		</Button>

		<p class="text-xs text-gray-500">
			Logging out will clear all cached data<br />
			<a href="#" class="text-blue-600 underline">Learn more</a>
		</p>
	</div>
	
</div>
<p class="text-xs text-gray-500 ">
	<a
	href="#"
	class="mt-6 flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:underline"
>
	Learn more

</a>
</p>
