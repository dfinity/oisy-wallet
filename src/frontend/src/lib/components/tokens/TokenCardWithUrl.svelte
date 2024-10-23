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

<div class="group flex gap-3 rounded-xl px-3 py-2 hover:bg-white active:bg-white sm:gap-8">
	<a
		class="flex-1 no-underline"
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
