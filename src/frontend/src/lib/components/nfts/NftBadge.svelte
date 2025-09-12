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
</script>

{#if nonNullish(token)}
	{#if token.section === CustomTokenSection.HIDDEN}
		<div class="flex items-center">
			<NftBadgeHidden />
		</div>
	{/if}

	{#if token.section === CustomTokenSection.SPAM}
		<div class="flex items-center">
			<NftBadgeSpam />
		</div>
	{/if}
{/if}
