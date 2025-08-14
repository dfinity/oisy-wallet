<script lang="ts">
	import type { NftCollectionUi } from '$lib/types/nft';
	import Img from '$lib/components/ui/Img.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { AppPath } from '$lib/constants/routes.constants';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';

	interface Props {
		collection: NftCollectionUi;
		disabled?: boolean;
	}

	const { collection, disabled }: Props = $props();
</script>

<a
	href={AppPath.Nfts + collection.collection.address}
	class="flex w-full flex-col gap-2 p-1 text-left no-underline"
>
	<div
		class="relative grid aspect-square gap-2 overflow-hidden rounded-xl border border-brand-subtle-20 bg-brand-subtle-10 p-1.5 duration-200"
		class:hover:bg-brand-subtle-20={!disabled}
		class:opacity-50={disabled}
		class:grid-cols-2={collection.nfts.length > 1}
		class:grid-cols-1={collection.nfts.length === 1}
	>
		{#each collection.nfts as nft, index (nft.id + index)}
			{#if index < 4 && nonNullish(nft.imageUrl)}
				<div class="aspect-square overflow-hidden rounded-lg">
					<Img src={nft.imageUrl} />
				</div>
			{/if}
		{/each}

		<span
			style="background: linear-gradient(-45deg, #382792A6 -100%, rgba(0, 0, 0, 0) 35%);"
			class="absolute m-[1px] h-full w-full"
		></span>

		<span class="absolute bottom-0 right-0 m-2.5">
			<NetworkLogo network={collection.collection.network} size="xs" color="white" />
		</span>
	</div>

	<div class="flex w-full flex-col gap-1">
		<span
			class="truncate text-sm font-bold"
			class:text-primary={!disabled}
			class:text-disabled={disabled}>{collection.collection.name}</span
		>
		<span class="text-xs" class:text-tertiary={!disabled} class:text-disabled={disabled}
			>{collection.nfts.length} items</span
		>
	</div>
</a>
