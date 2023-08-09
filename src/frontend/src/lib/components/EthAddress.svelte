<script lang="ts">
	import { ethAddressStore } from '$lib/stores/eth.store';
	import { isNullish } from '@dfinity/utils';
</script>

{#if isNullish($ethAddressStore)}
	<span>Loading eth address...</span>
{:else}
	<output>{$ethAddressStore}</output>

	<slot />
{/if}
