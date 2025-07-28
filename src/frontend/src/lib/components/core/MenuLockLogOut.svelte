<script lang="ts">
	import { nonNullish, secondsToDuration } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import SignOut from '$lib/components/core/SignOut.svelte';
	import IconLock from '$lib/components/icons/IconLock.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { authRemainingTimeStore } from '$lib/stores/auth.store';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onHidePopover?: () => void;
		hideText?: boolean;
	}

	let { onHidePopover, hideText = true }: Props = $props();

	const dispatch = createEventDispatcher();
	const remainingTimeMilliseconds = $derived($authRemainingTimeStore);

	const handleLogoutTriggered = () => {
		dispatch('icLogoutTriggered');
	};
</script>

<div class="mb-1 mt-2">
	<div class="flex justify-between gap-[12px] pl-3">
		<Button
			colorStyle="tertiary"
			styleClass="w-full py-2 flex-1 border-tertiary hover:text-brand-primary hover:bg-brand-subtle-10"
		>
			{$i18n.auth.text.lock}
			<IconLock />
		</Button>

		<SignOut on:icLogoutTriggered={handleLogoutTriggered} {onHidePopover} {hideText} />
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
