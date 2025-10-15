<script lang="ts">
	import NftHideButton from '$lib/components/nfts/NftHideButton.svelte';
	import NftSpamButton from '$lib/components/nfts/NftSpamButton.svelte';
	import { NFT_COLLECTION_HERO } from '$lib/constants/analytics.constants';
	import type { NonFungibleToken } from '$lib/types/nft';

	interface Props {
		token: NonFungibleToken;
	}

	let { token }: Props = $props();
</script>

<div class="flex gap-2">
	<NftSpamButton source={NFT_COLLECTION_HERO} {token} />
	<NftHideButton source={NFT_COLLECTION_HERO} {token} />
</div>
