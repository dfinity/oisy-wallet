<script lang="ts">
	import NftLogo from '$lib/components/nfts/NftLogo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft } from '$lib/types/nft';

	interface Props {
		nft: Nft;
	}

	let { nft }: Props = $props();
</script>

<div class="border-1 mb-5 flex rounded-lg border-brand-subtle-20 bg-brand-subtle-10 p-3">
	<div class="flex items-center">
		<span class="flex">
			<NftLogo badge={{ type: 'network' }} {nft} />
		</span>
		<div class="ml-4 flex flex-col">
			<span class="flex font-bold">{$i18n.send.text.send}: {nft?.name} #{nft?.id}</span>
			<span class="flex text-tertiary">{nft.collection.network.name}</span>
		</div>
	</div>
</div>
