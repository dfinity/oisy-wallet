<script lang="ts">
	import { nonNullish, secondsToDuration } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { LOGOUT_BUTTON } from '$lib/constants/test-ids.constants';
	import { signOut } from '$lib/services/auth.services';
	import { authRemainingTimeStore } from '$lib/stores/auth.store';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onHidePopover?: () => void;
		hideText?: boolean;
	}

	const { onHidePopover, hideText = false }: Props = $props();
	const dispatch = createEventDispatcher();

	const logout = async () => {
		dispatch('icLogoutTriggered');
		onHidePopover?.();
		await signOut({ resetUrl: true, clearAllPrincipalsStorages: true, source: 'menu-button' });
	};

	const remainingTimeMilliseconds = $derived($authRemainingTimeStore);
</script>

<Button
	colorStyle="secondary"
	onclick={logout}
	styleClass="w-full py-2 flex-1"
	testId={LOGOUT_BUTTON}
>
	<IconLogout />
	{$i18n.auth.text.logout}
</Button>

{#if !hideText && nonNullish(remainingTimeMilliseconds)}
	<span class="mt-1 block w-full text-center text-sm text-tertiary">
		{$i18n.settings.text.session_expires_in}
		{remainingTimeMilliseconds <= 0
			? '0'
			: secondsToDuration({
					seconds: BigInt(remainingTimeMilliseconds) / 1000n,
					i18n: $i18n.temporal.seconds_to_duration
				})}
	</span>
{/if}
