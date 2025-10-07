<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { goto } from '$app/navigation';
	import IconExpand from '$lib/components/icons/IconExpand.svelte';
	import NftHideButton from '$lib/components/nfts/NftHideButton.svelte';
	import NftSpamButton from '$lib/components/nfts/NftSpamButton.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NftCollection } from '$lib/types/nft';
	import { findNonFungibleToken, getAllowMediaForNft } from '$lib/utils/nfts.utils';
	import BgImg from '$lib/components/ui/BgImg.svelte';

	interface Props {
		collection?: NftCollection;
	}

	const { collection }: Props = $props();

	const token = $derived(
		nonNullish(collection)
			? findNonFungibleToken({
					tokens: $nonFungibleTokens,
					address: collection.address,
					networkId: collection.network.id
				})
			: undefined
	);

	const hasConsent: boolean | undefined = $derived(
		nonNullish(collection)
			? getAllowMediaForNft({
					tokens: $nonFungibleTokens,
					networkId: collection.network.id,
					address: collection.address
				})
			: false
	);
</script>

{#if nonNullish(collection)}
	<div class="my-5 flex flex-col rounded-lg bg-primary p-5">
		<div class="mb-6 flex flex-row justify-between gap-3">
			<div class=" flex flex-col items-start gap-3">
				<h5>{collection.name}</h5>

				<p class="mb-0 text-sm">{collection.description}</p>

				<span>
					<Button
						link
						paddingSmall
						onclick={() => goto(`${AppPath.Nfts}${collection.network.name}-${collection.address}`)}
						styleClass="inline-block text-sm"
						>{$i18n.nfts.text.go_to_collection}<IconExpand axis="y" /></Button
					>
				</span>
			</div>

			{#if nonNullish(collection.bannerImageUrl) && hasConsent}
				<div class="flex aspect-auto h-32 w-32 overflow-hidden rounded-lg">
					<BgImg imageUrl={collection.bannerImageUrl} size="cover" />
				</div>
			{/if}
		</div>

		<Hr />

		{#if nonNullish(token)}
			<div class="mt-6 flex w-full gap-2">
				<span><NftSpamButton {token} /></span>
				<span><NftHideButton {token} /></span>
			</div>
		{/if}
	</div>
{/if}
