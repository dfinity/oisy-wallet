<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { NonFungibleToken } from '$lib/types/nft';
	import NftBadgeHidden from '$lib/components/nfts/NftBadgeHidden.svelte';
	import NftBadgeSpam from '$lib/components/nfts/NftBadgeSpam.svelte';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';

	interface Props {
		token: NonFungibleToken | undefined;
	}

	const { token }: Props = $props();
</script>

{#if nonNullish(token) && (token.section === CustomTokenSection.HIDDEN || token.section === CustomTokenSection.SPAM)}
	<div class="flex items-center">
		{#if nonNullish(token) && token.section === CustomTokenSection.HIDDEN}
			<NftBadgeHidden />
		{/if}

		{#if nonNullish(token) && token.section === CustomTokenSection.SPAM}
			<NftBadgeSpam />
		{/if}
	</div>
{/if}
