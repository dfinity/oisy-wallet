<script lang="ts">
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import { TOKEN_CARD, TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import type { LogoSize } from '$lib/types/components';
	import type { CardData } from '$lib/types/token-card';

	export let data: CardData;
	export let logoSize: LogoSize = 'lg';
	export let testIdPrefix: typeof TOKEN_CARD | typeof TOKEN_GROUP = TOKEN_CARD;
</script>

<TokenCard {data} {logoSize} {testIdPrefix}>
	<TokenBalance {data} slot="balance" />

	<ExchangeTokenValue {data} slot="exchange" />
</TokenCard>
