<script lang="ts">
	import type { Nft } from '$lib/types/nft';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';

	interface Props {
		nft: Nft
	}

	let {nft}: Props = $props();
</script>

<div>
	<div class="rounded-lg overflow-hidden relative">
		<img
			src={nft.imageUrl}
			alt={nft.name}
			class="h-48"
			loading="lazy"
		/>

		<div class="absolute bottom-2 right-2">
			<NetworkLogo network={nft.contract.network} size="xs" color="white" />
		</div>
	</div>

	<div class="px-2 pt-2">
		<h3 class="text-xs font-semibold text-tertiary">{nft.contract.name}</h3>
		<span class="text-xs text-tertiary">{`#${nft.id}`}</span>
	</div>
</div>