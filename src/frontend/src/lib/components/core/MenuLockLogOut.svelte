<script lang="ts">
	import { nonNullish, secondsToDuration } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { authRemainingTimeStore } from '$lib/stores/auth.store';
	import { i18n } from '$lib/stores/i18n.store';
	import IconLock from '$lib/components/icons/IconLock.svelte';
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import SignOut from '$lib/components/core/SignOut.svelte';

	type Props = {
		hidePopover?: () => void;
		hideText?: boolean;
	  };
	
	  let { hidePopover = () => {}, hideText = true }: Props = $props();
	
	const dispatch = createEventDispatcher();
	const remainingTimeMilliseconds = $derived($authRemainingTimeStore);

	const handleLogoutTriggered = () => {
		dispatch('icLogoutTriggered');
	};
</script>

<div class="mt-2 mb-1">
	<div class="flex justify-between pl-3 gap-[12px]">
		
			<Button colorStyle="tertiary" styleClass='w-full py-2 flex-1 border-tertiary hover:text-brand-primary hover:bg-brand-subtle-10' >
				{$i18n.auth.text.lock}
				<IconLock />
			</Button>

			<SignOut on:icLogoutTriggered={handleLogoutTriggered} {hidePopover} {hideText} />
	</div>

	{#if nonNullish(remainingTimeMilliseconds)}
		<span class="mt-2 block w-full text-center text-sm text-tertiary">
			{$i18n.settings.text.session_expires_in}
			{remainingTimeMilliseconds <= 0
				? '0'
				: secondsToDuration({
						seconds: BigInt(remainingTimeMilliseconds) / 1000n,
						i18n: $i18n.temporal.seconds_to_duration
					})}
		</span>
	{/if}
</div>
