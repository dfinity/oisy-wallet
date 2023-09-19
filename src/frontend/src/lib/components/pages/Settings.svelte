<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { KeyValuePairInfo } from '@dfinity/gix-components';
	import { addressStore } from '$lib/stores/address.store';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { authRemainingTimeStore } from '$lib/stores/auth.store';
	import { nonNullish } from '@dfinity/utils';
	import { secondsToDuration } from '$lib/utils/date.utils';

	let remainingTimeMilliseconds: number | undefined;
	$: remainingTimeMilliseconds = $authRemainingTimeStore;
</script>

<KeyValuePairInfo>
	<svelte:fragment slot="key"><span class="font-bold">Your Principal:</span></svelte:fragment>
	<svelte:fragment slot="value"
		><output class="break-words">{shortenWithMiddleEllipsis($addressStore ?? '')}</output><Copy
			value={$addressStore ?? ''}
			text="Address copied to clipboard."
		/></svelte:fragment
	>
	<svelte:fragment slot="info">
		Your ID for the Oisy Wallet. Created by your Internet Identity.
	</svelte:fragment>
</KeyValuePairInfo>

<div class="mt-2">
	<KeyValuePairInfo>
		<svelte:fragment slot="key"
			><span class="font-bold">Your session expires in:</span></svelte:fragment
		>
		<output slot="value" class="mr-1.5">
			{#if nonNullish(remainingTimeMilliseconds)}
				{remainingTimeMilliseconds <= 0
					? '0'
					: secondsToDuration(BigInt(remainingTimeMilliseconds) / 1000n)}
			{/if}
		</output>

		<svelte:fragment slot="info">
			All sessions last 1 hour. After 1 hour, you will need to authenticate again with Internet
			Identity.
		</svelte:fragment>
	</KeyValuePairInfo>
</div>
