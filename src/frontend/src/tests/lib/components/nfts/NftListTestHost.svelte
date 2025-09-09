<script lang="ts">
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftList from '$lib/components/nfts/NftList.svelte';
	import type { Nft } from '$lib/types/nft';

	interface Props {
		nfts: Nft[];
		title?: string;
	}

	const { nfts, title }: Props = $props();
</script>

<NftList {nfts} {title}>
	{#snippet nftListItem({ nft })}
		<NftCard {nft} />
	{/snippet}
</NftList>
