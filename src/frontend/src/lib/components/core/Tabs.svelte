<script lang="ts">
	import { sortedTransactionsStore } from '$lib/stores/transactions.store';
	import { fade } from 'svelte/transition';

	let tab: 'tokens' | 'activity' = 'tokens';
</script>

<div
	class="font-bold flex"
	class:mb-4={$sortedTransactionsStore.length > 0}
	style="border-bottom: 1px solid var(--color-deep-violet)"
>
	<button
		class="flex-1 tab"
		style={`border-bottom: 3px solid ${
			tab === 'tokens' ? 'var(--color-deep-violet)' : 'transparent'
		}`}
		on:click={() => (tab = 'tokens')}>Tokens</button
	>
	<button
		class="flex-1 tab"
		style={`border-bottom: 3px solid ${
			tab === 'activity' ? 'var(--color-deep-violet)' : 'transparent'
		}`}
		on:click={() => (tab = 'activity')}>Activity</button
	>
</div>

{#if tab === 'tokens'}
	<div in:fade>
		<slot name="tokens" />
	</div>
{:else}
	<div in:fade>
		<slot name="transactions" />
	</div>
{/if}
