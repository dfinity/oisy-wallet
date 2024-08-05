<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import type { Token } from '$lib/types/token';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { isTokenCkLedger } from '$icp/utils/ic-send.utils';

	export let token: Token;
</script>

<Card noMargin>
	{#if isTokenCkLedger(token)}
				<Tag>ck</Tag>
				{token.twinToken?.name ?? token.name.replace(/^ck/, '')}
			{:else}
				{token.name}
			{/if}

	<TokenLogo {token} slot="icon" color="white" />

	<slot name="description" slot="description" />

	<slot name="exchange" slot="action" />
</Card>
