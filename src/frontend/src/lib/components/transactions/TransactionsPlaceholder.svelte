<script lang="ts">
	import IconOisyEmptyState from '$lib/components/icons/IconOisyEmptyState.svelte';
	import { NO_TRANSACTIONS_PLACEHOLDER } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="py-12" data-tid={NO_TRANSACTIONS_PLACEHOLDER}>
	<div class="mb-5 flex justify-center p-2">
		<IconOisyEmptyState />
	</div>

	<div class="space-y-4">
		<p class="m-0 text-center text-lg font-bold">{$i18n.transactions.text.transaction_history}</p>
		<p class="m-0 text-center text-tertiary">
			{$i18n.transactions.text.buy_or_receive}
		</p>
	</div>
</div>
