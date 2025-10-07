<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Img from '$lib/components/ui/Img.svelte';
	import type { NftCollection } from '$lib/types/nft';
	import Button from '$lib/components/ui/Button.svelte';
	import { goto } from '$app/navigation';
	import { AppPath } from '$lib/constants/routes.constants';
	import IconExpand from '$lib/components/icons/IconExpand.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import NftSpamButton from '$lib/components/nfts/NftSpamButton.svelte';
	import { findNonFungibleToken, getAllowMediaForNft } from '$lib/utils/nfts.utils';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import NftHideButton from '$lib/components/nfts/NftHideButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';

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
		<div class="flex flex-row gap-3">
			<div class="mb-2 flex flex-col gap-3">
				<h5>{collection.name}</h5>

				<p class="mb-0 text-sm">{collection.description}</p>

				<Button
					styleClass="inline-block mb-3 text-sm"
					link
					onclick={() => goto(`${AppPath.Nfts}${collection.network.name}-${collection.address}`)}
					>{$i18n.nfts.text.go_to_collection}<IconExpand axis="y" expanded /></Button
				>
			</div>

			{#if nonNullish(collection.bannerImageUrl) && hasConsent}
				<div class="max-h-30 flex min-w-6 overflow-hidden rounded-lg">
					<Img src={collection.bannerImageUrl} />
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
