<script lang="ts">
	import { customEvmNetworksStore } from '$eth/stores/custom-evm-networks.store';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		CUSTOM_EVM_NETWORKS_LIST,
		CUSTOM_EVM_NETWORKS_LIST_EMPTY,
		CUSTOM_EVM_NETWORKS_LIST_ITEM,
		CUSTOM_EVM_NETWORKS_REMOVE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	/**
	 * Two-step inline confirm for removal. The user's first click arms the
	 * row — the button text swaps to "Click again to confirm" and a second
	 * click (on the same row) commits the delete. Arming a different row
	 * resets the first one, so only one row is ever armed at a time. This
	 * avoids a full confirmation modal for what's still a rare action while
	 * guarding against accidental clicks on a painstakingly-typed entry.
	 */
	let pendingChainId: bigint | undefined = $state();

	const handleRemove = (chainId: bigint) => {
		if (pendingChainId === chainId) {
			customEvmNetworksStore.remove({ chainId });
			pendingChainId = undefined;
			return;
		}
		pendingChainId = chainId;
	};
</script>

{#if $customEvmNetworksStore.length === 0}
	<p class="text-sm text-tertiary" data-tid={CUSTOM_EVM_NETWORKS_LIST_EMPTY}>
		{$i18n.custom_networks.text.list_empty}
	</p>
{:else}
	<List testId={CUSTOM_EVM_NETWORKS_LIST} variant="styled">
		{#each $customEvmNetworksStore as network (network.id)}
			<ListItem>
				<div
					class="flex min-w-0 flex-col"
					data-tid={`${CUSTOM_EVM_NETWORKS_LIST_ITEM}-${network.chainId}`}
				>
					<span class="font-bold">{network.name}</span>
					<span class="text-xs text-tertiary">
						{$i18n.custom_networks.text.list_chain_id_label.replace(
							'$chainId',
							network.chainId.toString()
						)}
						·
						{network.env === 'mainnet'
							? $i18n.custom_networks.text.mainnet
							: $i18n.custom_networks.text.testnet}
					</span>
					<span class="truncate text-xs text-tertiary">{network.rpcUrl}</span>
				</div>
				<Button
					colorStyle={pendingChainId === network.chainId ? 'error' : 'secondary'}
					onclick={() => handleRemove(network.chainId)}
					testId={`${CUSTOM_EVM_NETWORKS_REMOVE_BUTTON}-${network.chainId}`}
				>
					{pendingChainId === network.chainId
						? $i18n.custom_networks.button.confirm_remove
						: $i18n.custom_networks.button.remove}
				</Button>
			</ListItem>
		{/each}
	</List>
{/if}
