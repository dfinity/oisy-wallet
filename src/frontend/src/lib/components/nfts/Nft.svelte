<script lang="ts">
	import { page } from '$app/stores';
	import { nftStore } from '$lib/stores/nft.store';
	import NftHero from '$lib/components/nfts/NftHero.svelte';
	import type { Nft } from '$lib/types/nft';

	const nftId = $derived($page.params.nftId);

	const nft: Nft | undefined = $derived(($nftStore ?? []).find((nft) => String(nft.id) === nftId));
</script>

<NftHero {nft} />
