<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { KeyValuePairInfo } from '@dfinity/gix-components';
	import { addressStore } from '$lib/stores/address.store';
	import Copy from '$lib/components/ui/Copy.svelte';
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
