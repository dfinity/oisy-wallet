<script lang="ts">
	import { goto } from '$app/navigation';
	import { AppPath } from '$lib/constants/routes.constants.js';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import List from '$lib/components/common/List.svelte';
	import type { Nft } from '$lib/types/nft';
	import Img from '$lib/components/ui/Img.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import BreadcrumbNavigation from '$lib/components/ui/BreadcrumbNavigation.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { onMount } from 'svelte';
	import { toastsError } from '$lib/stores/toasts.store';
	import { slide } from 'svelte/transition';

	interface Props {
		nft?: Nft;
	}

	const { nft }: Props = $props();

	const breadcrumbItems = $derived.by(() => {
		let breadcrumbs = [{ label: 'Assets', url: AppPath.Nfts as string }];
		if (nonNullish(nft) && nonNullish(nft.collection.name)) {
			breadcrumbs = [
				...breadcrumbs,
				{ label: nft.collection.name, url: AppPath.Nfts + nft.collection.address }
			];
		}
		return breadcrumbs;
	});

	let timeout: NodeJS.Timeout | undefined = $state();

	onMount(() => {
		timeout = setTimeout(() => {
			if (isNullish(nft)) {
				goto(AppPath.Nfts);
				toastsError({ msg: { text: 'Could not load NFT' } });
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
	<div class="relative h-64 w-full overflow-hidden">
		<div
			class="absolute flex h-64 w-full bg-cover bg-center blur"
			style={'background-image: url(' + nft?.imageUrl + '); box-shadow: inset 0 -1px #0000000d'}
			class:animate-pulse={isNullish(nft)}
			class:bg-disabled-alt={isNullish(nft)}
		>
		</div>
		{#if nonNullish(nft?.imageUrl)}
			<div class="absolute flex h-full w-full items-center justify-center text-center">
				<div class="relative flex h-[90%] overflow-hidden rounded-xl border-2 border-off-white">
					<Img src={nft?.imageUrl} />
					<span class="absolute bottom-0 right-0 m-2.5">
						<NetworkLogo network={nft.collection.network} size="xs" color="white" />
					</span>
				</div>
			</div>
		{/if}
	</div>

	<div class="bg-primary p-4">
		<BreadcrumbNavigation items={breadcrumbItems} />

		<h1 class="my-3">
			{#if nonNullish(nft)}
				{nft.name} #{nft.id}
			{:else}
				<span class="block max-w-80">
					<SkeletonText />
				</span>
			{/if}
		</h1>

		<List condensed styleClass="text-sm text-tertiary">
			<ListItem>
				<span>Collection contract address</span>
				{#if nonNullish(nft)}
					{nft.collection.address}
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
			<ListItem>
				<span>Network</span>
				{#if nonNullish(nft)}
					<NetworkWithLogo network={nft.collection.network} />
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
			<ListItem>
				<span>Token standard</span>
				{#if nonNullish(nft)}
					<span class="uppercase">{nft.collection.standard}</span>
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
			{#if nft?.collection.standard === 'erc1155'}
				<ListItem><span>Quantity</span><span class="uppercase">{nft.balance}</span></ListItem>
			{/if}
			{#if nonNullish(nft?.attributes) && nft.attributes.length > 0}
				<ListItem>Item traits</ListItem>
				<div class="mt-2 flex gap-2">
					{#each nft.attributes as trait, index (trait.value + index)}
						<div class="flex">
							<Badge variant="nft-trait"
								><span class="font-normal text-tertiary">{trait.traitType}</span><br /><span
									class="font-bold text-primary">{trait.value}</span
								></Badge
							>
						</div>
					{/each}
				</div>
			{/if}
		</List>
	</div>
</div>
