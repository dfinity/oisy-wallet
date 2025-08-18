<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import BreadcrumbNavigation from '$lib/components/ui/BreadcrumbNavigation.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft, NftCollection } from '$lib/types/nft';

	interface Props {
		collection?: NftCollection;
		nfts: Nft[];
	}

	const { collection, nfts }: Props = $props();

	const breadcrumbItems = $derived([{ label: $i18n.navigation.text.tokens, url: AppPath.Nfts }]);
</script>

<div class="relative overflow-hidden rounded-xl" in:slide>
	<div
		class="flex h-64 w-full"
		class:animate-pulse={isNullish(nfts?.[0])}
		class:bg-disabled-alt={isNullish(nfts?.[0])}
	>
		<BgImg imageUrl={nfts?.[0]?.imageUrl} size="cover" />
	</div>

	<div class="bg-primary p-4">
		<BreadcrumbNavigation items={breadcrumbItems} />

		<h1 class="my-3 truncate">
			{#if nonNullish(collection)}
				{collection.name}
			{:else}
				<span class="block max-w-40">
					<SkeletonText />
				</span>
			{/if}
		</h1>

		<List condensed styleClass="text-sm text-tertiary">
			<ListItem
				><span>{$i18n.nfts.text.collection_address}</span>

				{#if nonNullish(collection)}
					{collection.address}
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
			<ListItem>
				<span>{$i18n.networks.network}</span>
				{#if nonNullish(collection)}
					<NetworkWithLogo network={collection.network} />
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
			<ListItem>
				<span>{$i18n.nfts.text.token_standard}</span>
				{#if nonNullish(collection)}
					<span class="uppercase">{collection.standard}</span>
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
		</List>
	</div>
</div>
