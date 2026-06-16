<script lang="ts">
	import NftLogo from '$lib/components/nfts/NftLogo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft } from '$lib/types/nft';
	import { getNftDisplayName } from '$lib/utils/nft.utils';

	interface Props {
		nft: Nft;
	}

	let { nft }: Props = $props();

	const nftDisplayName = $derived(getNftDisplayName(nft));
</script>

<div class="border-brand-subtle-20 bg-brand-subtle-10 mb-5 flex rounded-lg border-1 p-3">
	<div class="flex items-center">
		<span class="flex">
			<NftLogo badge={{ type: 'network' }} {nft} />
		</span>
		<div class="ml-4 flex flex-col">
			<span class="flex font-bold">{$i18n.send.text.send}: {nftDisplayName}</span>
			<span class="text-tertiary flex">{nft.collection.network.name}</span>
		</div>
	</div>
</div>
