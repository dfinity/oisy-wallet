<script lang="ts">
	import { nonNullish, secondsToDuration } from '@dfinity/utils';
	import IconLock from '$lib/components/icons/IconLock.svelte';
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { LOCK_BUTTON, LOGOUT_BUTTON } from '$lib/constants/test-ids.constants';
	import { lockSession, signOut } from '$lib/services/auth.services';
	import { authRemainingTimeStore } from '$lib/stores/auth.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { authLocked } from '$lib/stores/locked.store';

	interface Props {
		onHidePopover?: () => void;
	}
	let { onHidePopover }: Props = $props();

	let remainingTimeMs = $derived($authRemainingTimeStore);

	const formatDuration = (ms: number) => {
		if (ms <= 0) {
			return '0';
		}
		return secondsToDuration({
			seconds: BigInt(ms) / 1000n,
			i18n: $i18n.temporal.seconds_to_duration
		});
	};

	const handleLogoutTriggered = async () => {
		onHidePopover?.();
		await signOut({ resetUrl: true, clearAllPrincipalsStorages: true, source: 'menu-button' });
	};

	const handleLock = async () => {
		onHidePopover?.();
		await lockSession({ resetUrl: false });
		authLocked.lock({ source: 'menu lock button' });
	};
</script>

<div class="mb-1 mt-2">
	<div class="flex justify-between gap-[12px]">
		<Button
			colorStyle="tertiary"
			onclick={handleLock}
			paddingSmall
			styleClass="w-full rounded-lg py-2 flex-1 border-tertiary hover:text-brand-primary hover:bg-brand-subtle-10"
			testId={LOCK_BUTTON}
		>
			{$i18n.auth.text.lock}
			<IconLock />
		</Button>

		<Button
			colorStyle="secondary"
			innerStyleClass="items-center justify-center"
			onclick={handleLogoutTriggered}
			paddingSmall
			styleClass="w-full rounded-lg py-2 flex-1"
			testId={LOGOUT_BUTTON}
		>
			{$i18n.auth.text.logout}
			<IconLogout />
		</Button>
	</div>

	{#if nonNullish(remainingTimeMs)}
		<span class="mt-2 block w-full text-center text-sm text-tertiary">
			{$i18n.settings.text.session_expires_in}
			{formatDuration(remainingTimeMs)}
		</span>
	{/if}
</div>
