<script lang="ts">
	import { formatToken } from '$lib/utils/format.utils.js';
	import { balancesStore } from '$lib/stores/balances.store.js';
	import { BigNumber } from '@ethersproject/bignumber';
	import TokenReceiveSend from '$lib/components/tokens/TokenReceiveSend.svelte';
	import CardAmount from '$lib/components/ui/CardAmount.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import type { Token } from '$lib/types/token';
	import { transactionsUrl } from '$lib/utils/nav.utils';

	export let token: Token;

	let url: string;
	$: url = transactionsUrl({ token });
</script>

<div class="flex gap-3 sm:gap-8 mb-6">
	<a
		class="no-underline flex-1"
		href={url}
		aria-label={`Open the list of ${token.symbol} transactions`}
	>
		<Card noMargin>
			{token.name}

			<TokenLogo {token} slot="icon" color="white" />

			<slot name="description" slot="description" />

			<slot name="exchange" slot="action" />
		</Card>
	</a>

	<slot name="actions" />
</div>
