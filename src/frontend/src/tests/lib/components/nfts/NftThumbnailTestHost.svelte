<script lang="ts">
	import NftThumbnail from '$lib/components/nfts/NftThumbnail.svelte';

	interface Props {
		imageUrl?: string;
	}

	const { imageUrl }: Props = $props();
</script>

<NftThumbnail {imageUrl}>
	{#snippet children({ imageUrl: displayUrl })}
		<span data-tid="nft-thumbnail-url">{displayUrl ?? 'none'}</span>
	{/snippet}
</NftThumbnail>
