<script lang="ts">
	import { themeStore } from '@dfinity/gix-components';
	import { onMount } from 'svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import IconKey from '$lib/components/icons/IconKey.svelte';
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { signOut } from '$lib/services/auth.services';
	import { signIn } from '$lib/services/auth.services';
	import { modalStore } from '$lib/stores/modal.store';

	const ariaLabel = $derived(replaceOisyPlaceholders($i18n.auth.alt.preview));
	const modalId = Symbol();

	let src = $state<string | undefined>(undefined);
	let width = $state<number>(window.innerWidth);

	onMount(() => {
		const handleResize = () => (width = window.innerWidth);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});

	const resolution = $derived(width >= 1440 ? '1440' : width >= 480 ? '768' : '480');

	$effect(() => {
		const currentResolution = resolution;
		const currentTheme = $themeStore ?? 'light';

		import(`$lib/assets/lockpage_assets/lock-image-${currentResolution}-${currentTheme}.webp`)
			.then((mod) => (src = mod.default))
			.catch(() => console.error('Failed to load background image'));
	});

	const handleUnlock = async () => {
		const { success } = await signIn({});

		if (success === 'cancelled' || success === 'error') {
			modalStore.openAuthHelp({ id: modalId, data: false });
		}
	};
	const handleLogout = async () =>  {
		await signOut({ resetUrl: true });
	};
</script>

<div class="background-overlay flex flex-col">
	<div
		class="fixed inset-0 z-[-1] flex items-center justify-center"
		style="background-color: color-mix(in srgb, var(--color-background-page) 30%, transparent); backdrop-filter: blur(35px);"
	>
		{#if src}
			<Img {src} alt={ariaLabel} styleClass="h-full object-contain mx-auto object-top" />
		{/if}
	</div>

	<div class="flex h-screen flex-col items-center justify-center px-4">
		<div
			class="flex w-full max-w-md flex-col content-center items-center justify-center gap-5 rounded-[24px] bg-[var(--color-background-surface)] p-6 text-center text-[var(--color-text-primary)] shadow-lg transition-all duration-500 ease-in-out md:rounded-[28px] md:p-8"
		>
			<div class="pointer-events-auto">
				<OisyWalletLogoLink />
			</div>
			<div class="lock_title_wrapper my-7">
				<h2 class="mb-2 text-2xl font-semibold"> {$i18n.lock.text.title_part_1}</h2>
				<span class="text-gray-600 mb-6">{$i18n.lock.text.title_part_2}</span>
			</div>
			<div class="lock_button_wrapper w-full">
				<Button fullWidth styleClass="w-full mb-3" onclick={handleUnlock}
					>{$i18n.lock.text.unlock}
					<IconKey />
				</Button>
				<Button fullWidth colorStyle="secondary-light" onclick={handleLogout}
					>{$i18n.lock.text.logout}
					<IconLogout />
				</Button>
			</div>
			<p class="text-gray-500 text-xs">
				{$i18n.lock.text.logout_clear_cash_message}
			</p>
		</div>
		<ExternalLink href="#" ariaLabel="Go to example.com" iconAsLast styleClass="mt-4">
			{$i18n.lock.text.learn_more}
		</ExternalLink>
	</div>
</div>

<style lang="scss">
	.background-overlay {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 4;
		background-color: var(--color-background-page);
		backdrop-filter: blur(35px);
	}
</style>
