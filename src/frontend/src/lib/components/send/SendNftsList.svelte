<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import NetworkFilterDropdown from '$lib/components/networks/NetworkFilterDropdown.svelte';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftList from '$lib/components/nfts/NftList.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { nftStore } from '$lib/stores/nft.store';
	import { nftSortStore } from '$lib/stores/settings.store';
	import type { Nft } from '$lib/types/nft';
	import { isDesktop } from '$lib/utils/device.utils';
	import { filterSortByCollection, findNftsByNetwork } from '$lib/utils/nfts.utils';

	interface Props {
		onSelect: (nft: Nft) => void;
	}

	let { onSelect }: Props = $props();

	const { filterNetwork, setFilterNetwork } = getContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY
	);

	let filter = $state('');

	const visible: Nft[] = $derived(
		($nftStore ?? []).filter(
			(nft) =>
				nft?.collection?.section !== CustomTokenSection.SPAM &&
				nft?.collection?.section !== CustomTokenSection.HIDDEN
		)
	);
	const filtered: Nft[] = $derived(
		filterSortByCollection({
			items: findNftsByNetwork({ nfts: visible, networkId: $filterNetwork?.id }),
			filter,
			sort: $nftSortStore
		})
	);

	let noNftsMatch = $derived(filtered.length === 0);
</script>

<div>
	<div class="input-field condensed mb-4 flex-1">
		<InputSearch
			autofocus={isDesktop()}
			placeholder={$i18n.send.placeholder.search_nfts}
			showResetButton={notEmptyString(filter)}
			bind:filter
		/>
	</div>

	<div class="flex min-w-0 items-center">
		<NetworkFilterDropdown
			onSelect={setFilterNetwork}
			selectedNetwork={$filterNetwork}
			showStakeBalance={false}
		/>
	</div>
</div>

{#if noNftsMatch}
	<EmptyState
		description={$i18n.send.text.no_nfts_found_desc}
		title={$i18n.send.text.no_nfts_found}
	/>
{:else}
	<NftList nfts={filtered}>
		{#snippet nftListItem({ nft })}
			<NftCard {nft} {onSelect} type="card-selectable" withCollectionLabel />
		{/snippet}
	</NftList>
{/if}
