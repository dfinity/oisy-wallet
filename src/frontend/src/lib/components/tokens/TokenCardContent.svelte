<script lang="ts">
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import type { LogoSize } from '$lib/types/logo-size';
	import type { TokenUi } from '$lib/types/token';

	export let token: TokenUi;
	export let logoSize: LogoSize | undefined = undefined;
	export let logoStyleClass: string | undefined = undefined;
</script>

<TokenCard {logoStyleClass} {logoSize} {token}>
	<TokenBalance {token} slot="balance" />

	<ExchangeTokenValue tokenUiBalance={token} slot="exchange" />
</TokenCard>
