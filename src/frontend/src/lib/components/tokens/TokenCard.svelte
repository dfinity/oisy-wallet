<script lang="ts">
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenName from '$lib/components/tokens/TokenName.svelte';
	import TokenSymbol from '$lib/components/tokens/TokenSymbol.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { TOKEN_CARD, TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import type { CardData } from '$lib/types/token-card';

	export let data: CardData;
	export let testIdPrefix: typeof TOKEN_CARD | typeof TOKEN_GROUP = TOKEN_CARD;
</script>

<Card noMargin testId={`${testIdPrefix}-${data.symbol}`}>
	<TokenSymbol {data} />

	<TokenName {data} slot="description" />

	<TokenLogo {data} slot="icon" color="white" />

	<slot name="balance" slot="amount" />

	<slot name="exchange" slot="amountDescription" />
</Card>
