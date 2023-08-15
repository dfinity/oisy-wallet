<script lang="ts">
	import ETHIcon from '$lib/components/icons/ETHIcon.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { addressStore } from '$lib/stores/address.store';
	import Address from '$lib/components/dashboard/Address.svelte';
</script>

<article class="gix bg-deep-violet text-ghost-white rounded-lg py-8 px-4 my-4 relative">
	<div class="absolute" style="top: -3rem; left: 1rem;">
		<ETHIcon />
	</div>

	{#if nonNullish($addressStore)}
		<Address />
	{/if}
</article>
