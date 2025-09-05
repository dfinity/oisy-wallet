<script lang="ts">
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { nftStore } from '$lib/stores/nft.store';
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import type { Nft } from '$lib/types/nft';
	import NftList from '$lib/components/nfts/NftList.svelte';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import { isDesktop } from '$lib/utils/device.utils';
	import { IconExpandMore } from '@dfinity/gix-components';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import { createEventDispatcher, getContext } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';

	interface Props {
		onSelect: (nft: Nft) => void;
	}

	let { onSelect }: Props = $props();

	const dispatch = createEventDispatcher();

	const { filterNetwork } = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	let filter = $state('');

	const filteredByInput: Nft[] = $derived(
		($nftStore ?? []).filter(
			(nft) => nft?.name?.toLowerCase().includes(filter.toLowerCase()) ?? false
		)
	);
	const filteredByNetwork: Nft[] = $derived(
		nonNullish($filterNetwork)
			? filteredByInput.filter((nft) => nft.collection.network.id === $filterNetwork.id)
			: filteredByInput
	);

	let noNftsMatch = $derived(filteredByNetwork.length === 0);
</script>

<div>
	<div class="input-field condensed mb-4 flex-1">
		<InputSearch
			autofocus={isDesktop()}
			placeholder={$i18n.tokens.placeholder.search_token}
			showResetButton={notEmptyString(filter)}
			bind:filter
		/>
	</div>

	<div class="flex items-center">
		<button
			class="dropdown-button h-[2.2rem] rounded-lg border border-solid border-primary"
			aria-label={$filterNetwork?.name ?? $i18n.networks.chain_fusion}
			onclick={() => dispatch('icSelectNetworkFilter')}
		>
			<span class="font-medium">{$filterNetwork?.name ?? $i18n.networks.chain_fusion}</span>
			<IconExpandMore size="24" />
		</button>
	</div>
</div>

{#if noNftsMatch}
	<EmptyState title="No NFTs found" />
{:else}
	<NftList nfts={filteredByInput}>
		{#snippet nftListItem({ nft })}
			<NftCard {nft} selectable {onSelect} />
		{/snippet}
	</NftList>
{/if}
