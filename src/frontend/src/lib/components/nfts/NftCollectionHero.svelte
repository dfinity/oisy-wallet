<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import BreadcrumbNavigation from '$lib/components/ui/BreadcrumbNavigation.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft, NftCollection } from '$lib/types/nft';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getContractExplorerUrl } from '$lib/utils/networks.utils';
	import CollectionSpamButton from '$lib/components/nfts/CollectionSpamButton.svelte';

	interface Props {
		collection?: NftCollection;
		nfts: Nft[];
	}

	const { collection, nfts }: Props = $props();

	const breadcrumbItems = $derived([{ label: $i18n.navigation.text.tokens, url: AppPath.Nfts }]);
</script>

<div class="relative overflow-hidden rounded-xl" in:slide>
	<div class="flex h-64 w-full">
		<BgImg imageUrl={nfts?.[0]?.imageUrl} size="cover" />
	</div>

	<div class="bg-primary p-4">
		<BreadcrumbNavigation items={breadcrumbItems} />

		{#if nonNullish(collection)}
			<div class="flex my-3">
				<h1 class="truncate">
					{collection.name}
				</h1>

				<div class="flex gap-2 ml-auto">
					<CollectionSpamButton />
					<CollectionSpamButton />
				</div>
			</div>
		{:else}
				<span class="block max-w-40">
					<SkeletonText />
				</span>
		{/if}

		<List condensed styleClass="text-sm text-tertiary">
			<ListItem
				><span>{$i18n.nfts.text.collection_address}</span>

				{#if nonNullish(collection)}
					<span class="flex items-center">
						<output>{shortenWithMiddleEllipsis({ text: collection.address })}</output>
						<AddressActions
							copyAddress={collection.address}
							copyAddressText={replacePlaceholders($i18n.nfts.text.address_copied, {
								$address: collection.address
							})}
							externalLink={getContractExplorerUrl({
								network: collection.network,
								contractAddress: collection.address
							})}
							externalLinkAriaLabel={$i18n.nfts.text.open_explorer}
						/>
					</span>
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
