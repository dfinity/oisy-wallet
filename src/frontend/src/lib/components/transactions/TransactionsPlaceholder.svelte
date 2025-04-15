<script lang="ts">
	import IconOisyEmptyState from '$lib/components/icons/IconOisyEmptyState.svelte';
	import { ACTIVITY_TRANSACTIONS_PLACEHOLDER } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {replaceOisyPlaceholders} from "$lib/utils/i18n.utils";

	export let isHiddenTransactions = false;
</script>

<div class="py-12" data-tid={ACTIVITY_TRANSACTIONS_PLACEHOLDER}>
	<div class="mb-5 flex justify-center p-2">
		<IconOisyEmptyState />
	</div>

	<div class="space-y-4">
		<p class="m-0 text-center text-lg font-bold">{isHiddenTransactions ? $i18n.transactions.text.hidden_transaction_history : $i18n.transactions.text.transaction_history}</p>
		<p class="m-0 text-center text-tertiary">
			{isHiddenTransactions ? replaceOisyPlaceholders($i18n.transactions.text.hidden_receive) : $i18n.transactions.text.buy_or_receive}
		</p>
	</div>
</div>
