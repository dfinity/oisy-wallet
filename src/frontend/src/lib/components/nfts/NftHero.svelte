<script lang="ts">
	import { goto } from '$app/navigation';
	import { AppPath } from '$lib/constants/routes.constants.js';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import List from '$lib/components/common/List.svelte';
	import type { Nft } from '$lib/types/nft';
	import Img from '$lib/components/ui/Img.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import BreadcrumbNavigation from '$lib/components/ui/BreadcrumbNavigation.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { nonNullish } from '@dfinity/utils';

	interface Props {
		nft: Nft;
	}

	const { nft }: Props = $props();

	const breadcrumbItems = [
		{ label: 'Assets', url: AppPath.Nfts },
		{ label: nft.collection.name ?? '', url: AppPath.Nfts + nft.collection.symbol }
	];
</script>

<div class="relative overflow-hidden rounded-xl">
	{#if nft?.imageUrl}
		<div class="relative h-64 w-full overflow-hidden">
			<div
				class="absolute flex h-64 w-full bg-cover bg-center blur"
				style={'background-image: url(' + nft.imageUrl + ')'}
			>
			</div>
			<div class="absolute flex h-full w-full items-center justify-center text-center">
				<div class="h-54 w-54 relative flex overflow-hidden rounded-xl border-2 border-off-white">
					<Img src={nft.imageUrl} />

					<span class="absolute bottom-0 right-0 m-2.5">
						<NetworkLogo network={nft.collection.network} size="xs" color="white" />
					</span>
				</div>
			</div>
		</div>
	{/if}

	<div class="bg-primary p-4">
		<BreadcrumbNavigation items={breadcrumbItems} />

		<h1 class="my-3">{nft.name} #{nft.id}</h1>

		<List condensed styleClass="text-sm text-tertiary">
			<ListItem><span>Collection contract address</span>{nft.collection.address}</ListItem>
			<ListItem><span>Network</span><NetworkWithLogo network={nft.collection.network} /></ListItem>
			<ListItem
				><span>Token standard</span><span class="uppercase">{nft.collection.standard}</span
				></ListItem
			>
			{#if nft.collection.standard === 'erc1155'}
				<ListItem><span>Quantity</span><span class="uppercase">{nft.balance}</span></ListItem>
			{/if}
			{#if nonNullish(nft.attributes) && nft.attributes.length > 0}
				<ListItem>Item traits</ListItem>
				<div class="mt-2 flex gap-2">
					{#each nft.attributes as trait}
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
