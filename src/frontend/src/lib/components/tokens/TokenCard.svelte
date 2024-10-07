<script lang="ts">
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenName from '$lib/components/tokens/TokenName.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { TOKEN_CARD } from '$lib/constants/test-ids.constants';
	import type { Token } from '$lib/types/token';

	export let token: Token;
</script>

<Card noMargin testId={`${TOKEN_CARD}-${token.symbol}`}>
	{token.symbol}

	<TokenName {token} slot="description" />

	<TokenLogo {token} slot="icon" color="white" />

	<!--	<slot name="description" slot="description" />-->

	<slot name="balance" slot="amount" />

	<slot name="exchange" slot="subAmount" />
</Card>
