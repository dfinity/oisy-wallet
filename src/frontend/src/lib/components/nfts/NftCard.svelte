<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import type { Nft } from '$lib/types/nft';

	interface Props {
		nft: Nft;
		testId?: string;
	}

	let { nft, testId }: Props = $props();
</script>

<div data-tid={testId}>
	<div class="relative overflow-hidden rounded-lg">
		{#if nonNullish(nft.imageUrl)}
			<img src={nft.imageUrl} alt={nft.name ?? ''} class="h-48" loading="lazy" />
		{:else}
			<div class="bg-black/16 h-48 rounded-lg"></div>
		{/if}

		<div class="absolute bottom-2 right-2">
			<NetworkLogo network={nft.contract.network} size="xs" color="white" />
		</div>
	</div>

	<div class="px-2 pt-2">
		<h3 class="text-xs font-semibold text-tertiary">{nft.contract.name}</h3>
		<span class="text-xs text-tertiary">{`#${nft.id}`}</span>
	</div>
</div>
