<script lang="ts">
	import type { Token } from '$lib/types/token';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import TokenDisplayCard from '$lib/components/tokens/TokenDisplayCard.svelte';

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
		<TokenDisplayCard {token}>
			<slot name="description" slot="description" />
			<slot name="exchange" slot="exchange" />
		</TokenDisplayCard>
	</a>

	<slot name="actions" />
</div>
