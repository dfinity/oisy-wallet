<script lang="ts">
	import type { Token } from '$lib/types/token';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';

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
		<TokenCard {token}>
			<slot name="description" slot="description" />
			<slot name="exchange" slot="exchange" />
		</TokenCard>
	</a>

	<slot name="actions" />
</div>
