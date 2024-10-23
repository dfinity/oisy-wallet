<script lang="ts">
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenName from '$lib/components/tokens/TokenName.svelte';
	import TokenSymbol from '$lib/components/tokens/TokenSymbol.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { TOKEN_CARD, TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import type { Token } from '$lib/types/token';

	export let token: Token;
	export let testIdPrefix: typeof TOKEN_CARD | typeof TOKEN_GROUP = TOKEN_CARD;
</script>

<Card noMargin testId={`${testIdPrefix}-${token.symbol}`}>
	<TokenSymbol {token} />

	<TokenName {token} slot="description" />

	<TokenLogo {token} slot="icon" color="white" />

	<slot name="balance" slot="amount" />

	<slot name="exchange" slot="amountDescription" />
</Card>
