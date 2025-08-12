<script lang="ts">
	import { page } from '$app/stores';
	import { nftStore } from '$lib/stores/nft.store';
	import Img from '$lib/components/ui/Img.svelte';
	import { nonNullish } from '@dfinity/utils';
	import NftHero from '$lib/components/nfts/NftHero.svelte';
	import type { Nft } from '$lib/types/nft';

	const nftId = $derived($page.params.nftId);

	const nft: Nft | undefined = $derived(($nftStore ?? []).find((nft) => String(nft.id) === nftId));
</script>

{#if nonNullish(nft)}
	<NftHero {nft} />
{/if}
