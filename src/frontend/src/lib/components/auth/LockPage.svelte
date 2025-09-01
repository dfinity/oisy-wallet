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
	import { authLocked } from '$lib/stores/locked.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const ariaLabel = $derived(replaceOisyPlaceholders($i18n.auth.alt.preview));
	const modalId = Symbol();
	const imgStyleClass = 'h-full object-contain mx-auto object-top';

	const handleUnlock = async () => {
		const { success } = await signIn({});

		if (success === 'ok') {
			authLocked.unlock({ source: 'login from lock page' });
		} else if (success === 'cancelled' || success === 'error') {
			modalStore.openAuthHelp({ id: modalId, data: false });
		}
	};

	const handleLogout = async () => {
		authLocked.unlock({ source: 'logout from lock page' });
		await signOut({ resetUrl: true, clearAllPrincipalsStorages: true, source: 'lock-page' });
	};
</script>

<div class="z-4 fixed inset-0 flex h-full w-full flex-col bg-page">
	<div class="backdrop-blur-xs fixed inset-0 -z-10 bg-overlay-page-30">
		<Responsive up="xl">
			{#await import(`$lib/assets/lockpage_assets/lock-image-1440-${$themeStore ?? 'light'}.webp`) then { default: src1440 }}
				<Img alt={ariaLabel} src={src1440} styleClass={imgStyleClass} />
			{/await}
		</Responsive>

		<Responsive down="xl" up="sm">
			{#await import(`$lib/assets/lockpage_assets/lock-image-768-${$themeStore ?? 'light'}.webp`) then { default: src768 }}
				<Img alt={ariaLabel} src={src768} styleClass={imgStyleClass} />
			{/await}
		</Responsive>

		<Responsive down="xs">
			{#await import(`$lib/assets/lockpage_assets/lock-image-480-${$themeStore ?? 'light'}.webp`) then { default: src480 }}
				<Img alt={ariaLabel} src={src480} styleClass={imgStyleClass} />
			{/await}
		</Responsive>
	</div>

	<div class="flex h-screen flex-col items-center justify-center px-4">
		<div
			class="rounded-4xl flex w-full max-w-md flex-col content-center items-center justify-center gap-5 bg-surface p-6 text-center text-primary shadow-lg transition-all duration-500 ease-in-out sm:p-8"
		>
			<OisyWalletLogoLink />

			<div class="my-6">
				<h2 class="mb-2 text-2xl font-semibold">{$i18n.lock.text.title_part_1}</h2>
				<span class="text-gray-600 mb-6">{$i18n.lock.text.title_part_2}</span>
			</div>

			<div class="w-full">
				<Button
					fullWidth
					innerStyleClass="items-center justify-center"
					onclick={handleUnlock}
					styleClass="mb-3 w-full"
				>
					{$i18n.lock.text.unlock}
					<IconKey />
				</Button>
				<Button
					colorStyle="secondary-light"
					fullWidth
					innerStyleClass="items-center justify-center"
					onclick={handleLogout}
				>
					{$i18n.lock.text.logout}
					<IconLogout />
				</Button>
			</div>

			<p class="tertiary mb-0 text-xs">
				{$i18n.lock.text.logout_clear_cash_message}
			</p>
		</div>

		<ExternalLink
			ariaLabel={$i18n.lock.text.learn_more}
			href="https://docs.oisy.com/using-oisy-wallet/how-tos/locking-and-logging-out"
			iconAsLast
			styleClass="mt-4"
		>
			{$i18n.lock.text.learn_more}
		</ExternalLink>
	</div>
</div>
