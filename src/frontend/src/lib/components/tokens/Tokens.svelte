<script lang="ts">
	import { fade } from 'svelte/transition';
	import NFTsList from '$lib/components/nfts/NFTsList.svelte';
	import ManageTokensButton from '$lib/components/tokens/ManageTokensButton.svelte';
	import TokensFilter from '$lib/components/tokens/TokensFilter.svelte';
	import TokensList from '$lib/components/tokens/TokensList.svelte';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import StickyHeader from '$lib/components/ui/StickyHeader.svelte';
	import { TokenType } from '$lib/enums/token-type';
	import { i18n } from '$lib/stores/i18n.store';

	let selectedTokenType = $state(TokenType.TOKEN);
</script>

<div>
	<StickyHeader>
		<div class="flex w-full justify-between">
			<div class="grow-1 relative flex justify-between">
				<TokensFilter>
					{#snippet overflowableContent()}
						<Button
							paddingSmall
							ariaLabel="a2sdasd"
							colorStyle={selectedTokenType === TokenType.TOKEN ? 'primary' : 'tertiary'}
							onclick={() => (selectedTokenType = TokenType.TOKEN)}
						>
							Tokens
						</Button>
						<Button
							paddingSmall
							ariaLabel="asdasd"
							colorStyle={selectedTokenType === TokenType.NFT ? 'primary' : 'tertiary'}
							onclick={() => (selectedTokenType = TokenType.NFT)}
						>
							NFTs
						</Button>

						<!--						<Header><span class="mt-2 flex">{$i18n.tokens.text.title}</span></Header> -->
					{/snippet}
				</TokensFilter>
			</div>
			<div class="flex">
				<TokensMenu />
			</div>
		</div>
	</StickyHeader>

	{#if selectedTokenType === TokenType.TOKEN}
		<TokensList />
	{:else}
		<NFTsList />
	{/if}

	<div in:fade class="mb-4 mt-12 flex w-full justify-center sm:w-auto">
		<ManageTokensButton />
	</div>
</div>
