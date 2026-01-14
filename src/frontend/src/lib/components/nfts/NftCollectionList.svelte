<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import EmptyNftsList from '$lib/components/nfts/EmptyNftsList.svelte';
	import NftCollectionCard from '$lib/components/nfts/NftCollectionCard.svelte';
	import NftsNetworkUnsupported from '$lib/components/nfts/NftsNetworkUnsupported.svelte';
	import { selectedNetworkNftUnsupported } from '$lib/derived/network.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import type { NftCollectionUi } from '$lib/types/nft';

	interface Props {
		title: string;
		section?: CustomTokenSection;
		icon?: Snippet;
		nftCollections: NftCollectionUi[];
		testId?: string;
	}

	let { title, section, icon, nftCollections, testId }: Props = $props();

	const notEmptyCollections = $derived(nftCollections.filter((c) => c.nfts.length > 0));
</script>

<div data-tid={testId}>
	{#if notEmptyCollections.length > 0 || isNullish(section)}
		<div class="mt-2 flex items-center gap-2">
			{@render icon?.()}
			<h5>{title}</h5>
		</div>

		{#if $selectedNetworkNftUnsupported}
			<NftsNetworkUnsupported hideDescription />
		{:else if notEmptyCollections.length > 0}
			<div class="grid grid-cols-2 gap-3 gap-y-4 py-4 md:grid-cols-3">
				{#each notEmptyCollections as collection, index (`${String(collection.collection.id)}-${index}`)}
					<NftCollectionCard
						{collection}
						isHidden={section === CustomTokenSection.HIDDEN}
						isSpam={section === CustomTokenSection.SPAM}
					/>
				{/each}
			</div>
		{:else}
			<EmptyNftsList hideDescription />
		{/if}
	{/if}
</div>
