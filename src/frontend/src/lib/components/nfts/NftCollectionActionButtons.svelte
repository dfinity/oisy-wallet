<script lang="ts">
	import type { NonFungibleToken } from '$lib/types/nft';
	import NftSpamButton from '$lib/components/nfts/NftSpamButton.svelte';
	import NftHideButton from '$lib/components/nfts/NftHideButton.svelte';

	interface Props {
		token: NonFungibleToken;
	}

	let { token }: Props = $props();
</script>

<div class="flex gap-2">
	<NftSpamButton {token} />
	<NftHideButton {token} />
</div>
