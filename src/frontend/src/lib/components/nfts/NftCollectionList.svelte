<script lang="ts">
	import type { Snippet } from 'svelte';
	import EmptyNftsList from '$lib/components/nfts/EmptyNftsList.svelte';
	import NftCollectionCard from '$lib/components/nfts/NftCollectionCard.svelte';
	import type { NftCollectionUi } from '$lib/types/nft';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import { isNullish } from '@dfinity/utils';

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

		{#if notEmptyCollections.length > 0}
			<div class="grid grid-cols-2 gap-3 gap-y-4 py-4 md:grid-cols-3">
				{#each notEmptyCollections as collection, index (`${String(collection.collection.id)}-${index}`)}
					<NftCollectionCard
						{collection}
						isSpam={section === CustomTokenSection.SPAM}
						isHidden={section === CustomTokenSection.HIDDEN}
					/>
				{/each}
			</div>
		{:else}
			<EmptyNftsList hideDescription />
		{/if}
	{/if}
</div>
