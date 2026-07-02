<script lang="ts">
	import IconGixInfo from '$lib/components/icons/IconGixInfo.svelte';
	import Collapsible from '$lib/components/ui/Collapsible.svelte';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { isNetworkIdBTCMainnet } from '$lib/utils/network.utils';

	let cmp = $state<Collapsible | undefined>();

	const onInfoButtonClick = () => {
		cmp?.toggleContent();
	};

	let isNetworkMainnet = $derived(isNetworkIdBTCMainnet($networkId));
</script>

<div class="mb-4">
	<div class="flex items-center">
		<h2 class="text-base">{$i18n.transactions.text.title}</h2>

		{#if isNetworkMainnet}
			<button class="ml-1 opacity-50" onclick={onInfoButtonClick}><IconGixInfo /></button>
		{/if}
	</div>

	{#if isNetworkMainnet}
		<Collapsible bind:this={cmp} expandButton={false} externalToggle={true}>
			{#snippet header()}{/snippet}
			<p class="mb-0 font-normal opacity-50">
				{$i18n.transactions.text.mainnet_btc_transactions_info}
			</p>
		</Collapsible>
	{/if}
</div>
