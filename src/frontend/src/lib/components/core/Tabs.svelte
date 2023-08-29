<script lang="ts">
	import { sortedTransactionsStore } from '$lib/stores/transactions.store';
	import { fade } from 'svelte/transition';
	import type { Tab, TabsContext } from '$lib/stores/tabs.store';
	import { setContext } from 'svelte';
	import { initTabsStore, TABS_CONTEXT_KEY } from '$lib/stores/tabs.store';

	const tabs: Tab[] = [
		{
			id: Symbol('1'),
			labelKey: 'Tokens'
		},
		{
			id: Symbol('2'),
			labelKey: 'Activity'
		}
	];

	const store = initTabsStore({
		tabId: tabs[0].id,
		tabs
	});

	setContext<TabsContext>(TABS_CONTEXT_KEY, {
		store
	});
</script>

<div
	class="font-bold flex"
	class:mb-4={$sortedTransactionsStore.length > 0}
	style="border-bottom: 1px solid var(--color-deep-violet)"
>
	<button
		class="flex-1 tab"
		style={`border-bottom: 3px solid ${
			$store.tabId === tabs[0].id ? 'var(--color-deep-violet)' : 'transparent'
		}`}
		on:click={() => store.select(tabs[0].id)}>Tokens</button
	>
	<button
		class="flex-1 tab"
		style={`border-bottom: 3px solid ${
			$store.tabId === tabs[1].id ? 'var(--color-deep-violet)' : 'transparent'
		}`}
		on:click={() => store.select(tabs[1].id)}>Activity</button
	>
</div>

{#if $store.tabId === tabs[0].id}
	<div in:fade>
		<slot name="tokens" />
	</div>
{:else if $store.tabId === tabs[1].id}
	<div in:fade>
		<slot name="transactions" />
	</div>
{/if}
