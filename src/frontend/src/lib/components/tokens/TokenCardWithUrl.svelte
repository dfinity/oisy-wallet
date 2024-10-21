<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { transactionsUrl } from '$lib/utils/nav.utils';

	export let token: Token;
	export let disableTabSelector = false;

	let url: string;
	$: url = transactionsUrl({ token });
</script>

<div class="flex gap-3 sm:gap-8 rounded-xl hover:bg-white">
	<a
		class="flex-1 no-underline py-2 px-3"
		href={url}
		aria-label={replacePlaceholders($i18n.transactions.text.open_transactions, {
			token: token.symbol
		})}
		tabindex={disableTabSelector ? -1 : 0}
	>
		<slot />
	</a>

	<slot name="actions" />
</div>
