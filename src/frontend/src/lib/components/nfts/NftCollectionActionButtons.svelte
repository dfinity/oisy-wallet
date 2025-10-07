<script lang="ts">
	import NftHideButton from '$lib/components/nfts/NftHideButton.svelte';
	import NftSpamButton from '$lib/components/nfts/NftSpamButton.svelte';
	import type { NonFungibleToken } from '$lib/types/nft';

	interface Props {
		token: NonFungibleToken;
	}

	let { token }: Props = $props();
</script>

<div class="flex gap-2">
	<NftSpamButton {token} />
	<NftHideButton {token} />
</div>
