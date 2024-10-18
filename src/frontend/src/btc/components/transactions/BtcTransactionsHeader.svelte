<script lang="ts">
	import { Collapsible, IconInfo } from '@dfinity/gix-components';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { isNetworkIdBTCMainnet } from '$lib/utils/network.utils';

	let toggleContent: () => void;

	const onInfoButtonClick = () => {
		toggleContent();
	};

	let isNetworkMainnet = false;
	$: isNetworkMainnet = isNetworkIdBTCMainnet($networkId);
</script>

<div class="mb-6">
	<div class="flex items-center">
		<h2 class="text-base">{$i18n.transactions.text.title}</h2>

		{#if isNetworkMainnet}
			<button class="ml-1 opacity-50" on:click={onInfoButtonClick}><IconInfo /></button>
		{/if}
	</div>

	{#if isNetworkMainnet}
		<Collapsible expandButton={false} externalToggle={true} bind:toggleContent>
			<p class="mb-0 font-normal opacity-50">
				{$i18n.transactions.text.mainnet_btc_transactions_info}
			</p>
		</Collapsible>
	{/if}
</div>
