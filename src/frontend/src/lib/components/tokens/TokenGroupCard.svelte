<script lang="ts">
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import type { TokenGroupUi, TokenUi } from '$lib/types/token';
	import Listener from '$lib/components/core/Listener.svelte';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import { TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import Card from '$lib/components/ui/Card.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenName from '$lib/components/tokens/TokenName.svelte';
	import TokenSymbol from '$lib/components/tokens/TokenSymbol.svelte';

	export let tokenGroup: TokenGroupUi;

	const totalBalance = tokenGroup.tokens.reduce((sum, token: TokenUi) => {
		return sum + (token.balance || 0);
	}, 0);

	const totalBalanceUsd = tokenGroup.tokens.reduce((sum, token: TokenUi) => {
		return sum + (token.usdBalance || 0);
	}, 0);
</script>

<Card noMargin testId={`${TOKEN_GROUP}-${tokenGroup.header.symbol}`}>
	<TokenSymbol token={{symbol:tokenGroup.header.name, network: tokenGroup.native}} />

	<TokenName token={{name: tokenGroup.header.symbol}} slot="description" />

	<TokenLogo token={{name: tokenGroup.header.name, icon: tokenGroup.header.icon, network: tokenGroup.native}} showNetworkIcon={false} slot="icon" color="white" />

	<span slot="balance">{totalBalance}</span>
	<span slot="amountDescription">{totalBalanceUsd}</span>
</Card>

<div class="bg-grey">
	{#each tokenGroup.tokens as token}
		<Listener {token}>
			<TokenCardWithUrl {token}>
				<TokenCard {token} />
			</TokenCardWithUrl>
		</Listener>
	{/each}
</div>
