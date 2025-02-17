<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { transactionsUrl } from '$lib/utils/nav.utils';

	export let token: Token;
	export let disableTabSelector = false;
	export let styleClass = '';

	let url: string;
	$: url = transactionsUrl({ token });
</script>

<div class={`group gap-3 sm:gap-8 flex ${styleClass}`}>
	<a
		class="unstyled flex-1 no-underline"
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
