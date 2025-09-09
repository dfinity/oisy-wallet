<script lang="ts">
	import type { Nft } from '$lib/types/nft';
	import NftLogo from '$lib/components/nfts/NftLogo.svelte';

	interface Props {
		nft: Nft;
	}

	let { nft }: Props = $props();
</script>

<div class="border-1 mb-5 flex rounded-lg border-brand-subtle-20 bg-brand-subtle-10 p-3">
	<div class="flex items-center">
		<span class="flex bg-primary">
			<NftLogo {nft} badge={{ type: 'network' }} ring />
		</span>
		<div class="ml-4 flex flex-col">
			<span class="flex font-bold">Send: {nft?.name} #{nft?.id}</span>
			<span class="flex text-tertiary">{nft.collection.network.name}</span>
		</div>
	</div>
</div>
