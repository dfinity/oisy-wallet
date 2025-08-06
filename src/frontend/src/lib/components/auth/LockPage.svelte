<script lang="ts">
	import { themeStore } from '@dfinity/gix-components';
	import { onMount } from 'svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const ariaLabel = $derived(replaceOisyPlaceholders($i18n.auth.alt.preview));

	let src = $state<string | undefined>(undefined);
 	let width = $state<number>(window.innerWidth);

	onMount(() => {
		let timeout: number;
		const handleResize = () => {
			clearTimeout(timeout);
			timeout = setTimeout(() => (width = window.innerWidth), 100);
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});
	

	const resolution = $derived(width >= 1440 ? '1440' : '768');

	$effect(() => {
		const currentResolution = resolution;
		const currentTheme = $themeStore ?? 'light';

		import(`$lib/assets/lockpage_assets/lock-image-${currentResolution}-${currentTheme}.webp`)
			.then((mod) => (src = mod.default))
			.catch(() => console.error('Failed to load background image'));
	});

	const handleUnlock = () => console.log('Unlock clicked');
	const handleLogout = () => console.log('Logout clicked');
</script>

<div class="background-overlay">
	<div
		class="fixed inset-0 z-[-1] flex justify-center"
		style="background-color: color-mix(in srgb, var(--color-background-page) 30%, transparent); backdrop-filter: blur(35px);"
	>
		{#if src}
			<Img {src} alt={ariaLabel} styleClass="h-full object-contain mx-auto object-top" />
		{/if}
	</div>

	<div class="flex h-screen items-center justify-center px-4">
		<div
			class="flex w-full max-w-md flex-col content-center items-center justify-center rounded-[24px] bg-[var(--color-background-surface)] p-6 text-center text-[var(--color-text-primary)] shadow-lg transition-all duration-500 ease-in-out md:rounded-[28px] md:p-8"
		>
			<div class="mb-6">
				<div class="pointer-events-auto">
					<OisyWalletLogoLink />
				</div>
			</div>

			<h2 class="mb-2 text-2xl font-semibold">Wallet locked</h2>
			<p class="text-gray-600 mb-6">Unlock to continue in OISY</p>

			<Button fullWidth styleClass="w-full mb-3" onclick={handleUnlock}>Unlock</Button>

			<Button fullWidth colorStyle="secondary-light" onclick={handleLogout}>Log out</Button>

			<p class="text-gray-500 text-xs">
				Logging out will clear all cached data<br />
				<a href="#" class="text-blue-600 underline">Learn more</a>
			</p>
		</div>
	</div>
	<p class="text-gray-500 text-xs">
		<a
			href="#"
			class="mt-6 flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:underline"
		>
			Learn more
		</a>
	</p>
</div>

<style lang="scss">
	.background-overlay {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: -1;
		background-color: var(--color-background-page);
		backdrop-filter: blur(35px);
	}
</style>
