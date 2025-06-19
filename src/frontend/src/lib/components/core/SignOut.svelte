<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import { LOGOUT_BUTTON } from '$lib/constants/test-ids.constants';
	import { signOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import Button from '$lib/components/ui/Button.svelte';
	import { authRemainingTimeStore } from '$lib/stores/auth.store';
	import { nonNullish, secondsToDuration } from '@dfinity/utils';

	const dispatch = createEventDispatcher();

	const logout = async () => {
		dispatch('icLogoutTriggered');
		await signOut({ resetUrl: true });
	};

	const remainingTimeMilliseconds = $derived($authRemainingTimeStore);
</script>

<span class="mb-1 mt-2">
	<Button
		onclick={logout}
		colorStyle="secondary"
		testId={LOGOUT_BUTTON}
		styleClass="py-2"
		fullWidth
	>
		<IconLogout />
		{$i18n.auth.text.logout}
	</Button>

	{#if nonNullish(remainingTimeMilliseconds)}
		<span class="mt-1 block w-full text-center text-sm text-tertiary">
			{$i18n.settings.text.session_expires_in}
			{remainingTimeMilliseconds <= 0
				? '0'
				: secondsToDuration({ seconds: BigInt(remainingTimeMilliseconds) / 1000n })}
		</span>
	{/if}
</span>
