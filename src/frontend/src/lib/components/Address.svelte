<script lang="ts">
	import { addressStore } from '$lib/stores/address.store';
	import { isNullish } from '@dfinity/utils';
</script>

{#if isNullish($addressStore)}
	<span>Loading eth address...</span>
{:else}
	<output>{$addressStore}</output>

	<slot />
{/if}
