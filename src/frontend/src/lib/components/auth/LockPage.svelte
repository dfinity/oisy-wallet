<script lang="ts">
	import { themeStore } from '@dfinity/gix-components';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import IconKey from '$lib/components/icons/IconKey.svelte';
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { signOut, signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { authLocked } from '$lib/utils/locked.utils';

	const ariaLabel = $derived(replaceOisyPlaceholders($i18n.auth.alt.preview));
	const modalId = Symbol();

	let src = $state<string | undefined>(undefined);

	$effect(() => {
		const currentTheme = $themeStore ?? 'light';

		import(`$lib/assets/lockpage_assets/lock-image-1440-${currentTheme}.webp`)
			.then((mod) => (src = mod.default))
			.catch(() => console.error('Failed to load background image'));
	});

	const handleUnlock = async () => {
		const { success } = await signIn({});
		authLocked.set(false);

		if (success === 'cancelled' || success === 'error') {
			modalStore.openAuthHelp({ id: modalId, data: false });
		}
	};

	const handleLogout = async () => {
		authLocked.set(false);
		await signOut({ resetUrl: true });
	};
</script>

<div class="background-overlay flex flex-col">
	<div
		class="fixed inset-0 z-[-1] flex items-center justify-center"
		style="background-color: color-mix(in srgb, var(--color-background-page) 30%, transparent); backdrop-filter: blur(35px);"
	>
		{#if src}
			<Responsive up="xl">
				<Img {src} alt={ariaLabel} styleClass="h-full object-contain mx-auto object-top" />
			</Responsive>
			<Responsive up="md" down="lg">
				<Img
					src={src.replace('1440', '768')}
					alt={ariaLabel}
					styleClass="h-full object-contain mx-auto object-top"
				/>
			</Responsive>
			<Responsive down="sm">
				<Img
					src={src.replace('1440', '480')}
					alt={ariaLabel}
					styleClass="h-full object-contain mx-auto object-top"
				/>
			</Responsive>
		{/if}
	</div>

	<div class="flex h-screen flex-col items-center justify-center px-4">
		<div
			class="flex w-full max-w-md flex-col content-center items-center justify-center gap-5 rounded-[24px] bg-[var(--color-background-surface)] p-6 text-center text-[var(--color-text-primary)] shadow-lg transition-all duration-500 ease-in-out md:rounded-[28px] md:p-8"
		>
			<OisyWalletLogoLink />
			<div class="my-7">
				<h2 class="mb-2 text-2xl font-semibold"> {$i18n.lock.text.title_part_1}</h2>
				<span class="text-gray-600 mb-6">{$i18n.lock.text.title_part_2}</span>
			</div>
			<div class="w-full">
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
