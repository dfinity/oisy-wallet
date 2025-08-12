<script lang="ts">
	import { nonNullish, secondsToDuration } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import ButtonTextIcon from '$lib/components/ui/ButtonTextIcon.svelte';
	import IconLock from '$lib/components/icons/IconLock.svelte';
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { LOCK_BUTTON, LOGOUT_BUTTON } from '$lib/constants/test-ids.constants';
	import { lockSession , signOut } from '$lib/services/auth.services';
		import { authRemainingTimeStore } from '$lib/stores/auth.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { authLocked } from '$lib/stores/locked.store';

	interface Props {
		onHidePopover?: () => void;
	}
	let { onHidePopover }: Props = $props();

	let remainingTimeMs = $derived($authRemainingTimeStore);
	const dispatch = createEventDispatcher();

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
		dispatch('icLogoutTriggered');
		onHidePopover?.();
		await signOut({ resetUrl: true });
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
			paddingSmall
			styleClass="flex w-full rounded-lg py-2 flex-1 border-tertiary hover:text-brand-primary hover:bg-brand-subtle-10"
			style="border-radius: var(--border-radius);"
			testId={LOCK_BUTTON}
			onclick={handleLock}
		>
			{$i18n.auth.text.lock}
			<IconLock />
		</Button>

		<ButtonTextIcon
			onclick={handleLogoutTriggered}
			paddingSmall
			colorStyle="secondary"
			testId={LOGOUT_BUTTON}
			styleClass="flex items-center w-full gap-2 rounded-lg py-2 flex-1"
		>
			{$i18n.auth.text.logout}
			{#snippet icon()}
			<IconLogout />
			{/snippet}
		</ButtonTextIcon>
	</div>

	{#if nonNullish(remainingTimeMs)}
		<span class="mt-2 block w-full text-center text-sm text-tertiary">
			{$i18n.settings.text.session_expires_in}
			{formatDuration(remainingTimeMs)}
		</span>
	{/if}
</div>
