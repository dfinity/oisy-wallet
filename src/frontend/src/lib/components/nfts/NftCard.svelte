<script lang="ts">
	import type { Nft } from '$lib/types/nft';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';

	interface Props {
		nft: Nft
	}

	let {nft}: Props = $props();
</script>

<div>
	<div class="rounded-lg overflow-hidden shadow-md relative">
		<img
			src={nft.imageUrl}
			alt={nft.name ?? 'NFT'}
			class="w-full h-48 object-cover"
			loading="lazy"
		/>

		<div class="absolute bottom-2 right-2">
			<NetworkLogo network={nft.contract.network} color="white" />
		</div>

	</div>

	<div class="p-2">
		<h3 class="text-xs font-semibold text-tertiary">{nft.name || 'Untitled NFT'}</h3>
	</div>
</div>