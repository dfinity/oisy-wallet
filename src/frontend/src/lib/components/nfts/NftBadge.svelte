<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import NftBadgeHidden from '$lib/components/nfts/NftBadgeHidden.svelte';
	import NftBadgeSpam from '$lib/components/nfts/NftBadgeSpam.svelte';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import type { NonFungibleToken } from '$lib/types/nft';

	interface Props {
		token?: NonFungibleToken;
	}

	const { token }: Props = $props();

	let section = $derived(token?.section);

	let Badge = $derived(
		section === CustomTokenSection.HIDDEN
			? NftBadgeHidden
			: section === CustomTokenSection.SPAM
				? NftBadgeSpam
				: undefined
	);
</script>

{#if nonNullish(Badge)}
	<div class="flex items-center">
		<Badge />
	</div>
{/if}
