<script lang="ts">
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import type { LogoSize } from '$lib/types/components';
	import type { TokenUi } from '$lib/types/token';

	export let token: TokenUi;
	export let logoSize: LogoSize = 'lg';
</script>

<TokenCard {token} {logoSize}>
	<TokenBalance {token} slot="balance" />

	<ExchangeTokenValue {token} slot="exchange" />
</TokenCard>
