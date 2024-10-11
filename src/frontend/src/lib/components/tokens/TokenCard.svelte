<script lang="ts">
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenName from '$lib/components/tokens/TokenName.svelte';
	import TokenSymbol from '$lib/components/tokens/TokenSymbol.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { TOKEN_CARD } from '$lib/constants/test-ids.constants';
	import type { Token } from '$lib/types/token';

	export let token: Token;
</script>

<Card noMargin testId={`${TOKEN_CARD}-${token.symbol}`}>
	<TokenSymbol {token} />

	<TokenName {token} slot="description" />

	<TokenLogo {token} showNetworkIcon={false} slot="icon" color="white" />

	<slot name="balance" slot="amount" />

	<slot name="exchange" slot="subAmount" />
</Card>
