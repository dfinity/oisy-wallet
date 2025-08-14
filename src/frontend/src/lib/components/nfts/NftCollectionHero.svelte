<script lang="ts">
	import type { Nft, NftCollection } from '$lib/types/nft';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import { goto } from '$app/navigation';
	import { AppPath } from '$lib/constants/routes.constants';
	import BreadcrumbNavigation from '$lib/components/ui/BreadcrumbNavigation.svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { onMount } from 'svelte';
	import { toastsError } from '$lib/stores/toasts.store';
	import { slide } from 'svelte/transition';

	interface Props {
		collection?: NftCollection;
		nfts: Nft[];
	}

	const { collection, nfts }: Props = $props();

	const breadcrumbItems = [{ label: 'Assets', url: AppPath.Nfts }];

	let timeout: NodeJS.Timeout | undefined = $state();

	onMount(() => {
		timeout = setTimeout(() => {
			if (isNullish(collection)) {
				goto(AppPath.Nfts);
				toastsError({ msg: { text: 'Could not load collection' } });
			}
		}, 10000);

		return () => {
			if (nonNullish(timeout)) {
				clearTimeout(timeout);
			}
		};
	});
</script>

<div class="relative overflow-hidden rounded-xl" in:slide>
	<div
		class="flex h-64 w-full bg-cover bg-center"
		style={'background-image: url(' + nfts?.[0]?.imageUrl + '); box-shadow: inset 0 -1px #0000000d'}
		class:animate-pulse={isNullish(nfts?.[0])}
		class:bg-disabled-alt={isNullish(nfts?.[0])}
	>
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
				><span>Collection contract address</span>

				{#if nonNullish(collection)}
					{collection.address}
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
			<ListItem>
				<span>Network</span>
				{#if nonNullish(collection)}
					<NetworkWithLogo network={collection.network} />
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
			<ListItem>
				<span>Token standard</span>
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
