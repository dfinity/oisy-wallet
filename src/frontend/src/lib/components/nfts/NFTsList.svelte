<script lang="ts">
	import NFTsDisplayHandler from '$lib/components/nfts/NFTsDisplayHandler.svelte';
	import { tokens } from '$lib/derived/tokens.derived';
	import { onMount } from 'svelte';
	import { InfuraERC721Provider } from '$eth/providers/infura-erc721.providers';
	import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
	import { loadErc721Tokens } from '$eth/services/erc721.services';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nftStore } from '$eth/stores/nft.store';

	let nfts = $state();

	onMount(async () => {
		// const provider = new InfuraERC721Provider(ETHEREUM_NETWORK.providers.infura)

		// const data = await provider.metadata("0xED5AF388653567Af2F388E6224dC7C4b3241C544", 6694)

		// await provider.balanceOf("0xED5AF388653567Af2F388E6224dC7C4b3241C544", "0xde5ae63a348c4d63343c8e20fb6286909418c8a4")

		// await provider.ownerOf("0xED5AF388653567Af2F388E6224dC7C4b3241C544", 6694)

		// console.log(data)

		// await loadErc721Tokens()
	})

	// $effect(() => console.log($tokens))
	$effect(() => console.log($nftStore))
</script>

<NFTsDisplayHandler bind:nfts>
	wulll
</NFTsDisplayHandler>