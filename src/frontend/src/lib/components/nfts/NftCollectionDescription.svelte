<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import NftImageConsent from '$lib/components/nfts/NftImageConsent.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import type { Nft, NftCollection, NonFungibleToken } from '$lib/types/nft';
	import Button from '$lib/components/ui/Button.svelte';
	import { goto } from '$app/navigation';
	import { AppPath } from '$lib/constants/routes.constants';
	import { IconExplore } from '@dfinity/gix-components';
	import IconExpand from '$lib/components/icons/IconExpand.svelte';
	import Divider from '$lib/components/common/Divider.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import NftSpamButton from '$lib/components/nfts/NftSpamButton.svelte';
	import { findNonFungibleToken } from '$lib/utils/nfts.utils';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import NftHideButton from '$lib/components/nfts/NftHideButton.svelte';

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
</script>

{#if nonNullish(collection)}
	<div class="my-5 flex flex-col gap-2 rounded-lg bg-primary p-5">
		<h5>{collection.name}</h5>

		<div>{collection.description}</div>

		<Button
			styleClass="inline-block mb-3"
			link
			onclick={() => goto(`${AppPath.Nfts}${collection.network.name}-${collection.address}`)}
			>Go to collection <IconExpand axis="y" expanded /></Button
		>

		<Hr />

		{#if nonNullish(token)}
			<div class="mt-5 flex w-full gap-2">
				<span><NftSpamButton {token} /></span>
				<span><NftHideButton {token} /></span>
			</div>
		{/if}
	</div>
{/if}
