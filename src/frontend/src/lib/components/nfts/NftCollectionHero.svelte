<script lang="ts">
	import type { Nft, NftCollection } from '$lib/types/nft';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import { goto } from '$app/navigation';
	import { AppPath } from '$lib/constants/routes.constants';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import BreadcrumbNavigation from '$lib/components/ui/BreadcrumbNavigation.svelte';

	interface Props {
		collection: NftCollection;
		nfts: Nft[];
	}

	const { collection, nfts }: Props = $props();

	const breadcrumbItems = [{ label: 'Assets', url: AppPath.Nfts }];
</script>

<div class="relative overflow-hidden rounded-xl">
	{#if nfts?.[0]?.imageUrl}
		<div
			class="flex h-64 w-full bg-cover bg-center"
			style={'background-image: url(' + nfts[0].imageUrl + ')'}
		>
		</div>
	{/if}

	<div class="bg-primary p-4">
		<BreadcrumbNavigation items={breadcrumbItems} />

		<h1 class="my-3">{collection.name}</h1>

		<List condensed styleClass="text-sm text-tertiary">
			<ListItem><span>Collection contract address</span>{collection.address}</ListItem>
			<ListItem><span>Network</span><NetworkWithLogo network={collection.network} /></ListItem>
			<ListItem
				><span>Token standard</span><span class="uppercase">{collection.standard}</span></ListItem
			>
		</List>
	</div>
</div>
