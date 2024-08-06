<script lang="ts">
	import type { Token } from '$lib/types/token';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';

	export let token: Token;

	let url: string;
	$: url = transactionsUrl({ token });
</script>

<div class="flex gap-3 sm:gap-8 mb-6">
	<a
		class="no-underline flex-1"
		href={url}
		aria-label={replacePlaceholders($i18n.transactions.text.open_transactions, {
			token: token.symbol
		})}
	>
		<slot />
	</a>

	<slot name="actions" />
</div>
