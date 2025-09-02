<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import NftCollectionActionButtons from '$lib/components/nfts/NftCollectionActionButtons.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import BreadcrumbNavigation from '$lib/components/ui/BreadcrumbNavigation.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft, NonFungibleToken } from '$lib/types/nft';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getContractExplorerUrl } from '$lib/utils/networks.utils';

	interface Props {
		token?: NonFungibleToken;
		nfts: Nft[];
	}

	const { token, nfts }: Props = $props();

	const breadcrumbItems = $derived([{ label: $i18n.navigation.text.tokens, url: AppPath.Nfts }]);
</script>

<div class="relative overflow-hidden rounded-xl" in:slide>
	<div class="flex h-64 w-full">
		<BgImg imageUrl={nfts?.[0]?.imageUrl} size="cover" />
	</div>

	<div class="bg-primary p-4">
		<BreadcrumbNavigation items={breadcrumbItems} />

		{#if nonNullish(token)}
			<div class="my-3 flex items-center gap-3">
				<h1 class="truncate">
					{token.name}
				</h1>

				{#if token.section === CustomTokenSection.HIDDEN}
					<Badge styleClass="pl-1 pr-2 " variant="disabled" width="w-fit">
						<div class="flex items-center gap-1">
							<IconEyeOff size="18" />
							{$i18n.nfts.text.hidden}
						</div>
					</Badge>
				{/if}

				<div class="ml-auto">
					<NftCollectionActionButtons {token} />
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

				{#if nonNullish(token)}
					<span class="flex items-center">
						<output>{shortenWithMiddleEllipsis({ text: token.address })}</output>
						<AddressActions
							copyAddress={token.address}
							copyAddressText={replacePlaceholders($i18n.nfts.text.address_copied, {
								$address: token.address
							})}
							externalLink={getContractExplorerUrl({
								network: token.network,
								contractAddress: token.address
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
				{#if nonNullish(token)}
					<NetworkWithLogo network={token.network} />
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
			<ListItem>
				<span>{$i18n.nfts.text.token_standard}</span>
				{#if nonNullish(token)}
					<span class="uppercase">{token.standard}</span>
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
		</List>
	</div>
</div>
