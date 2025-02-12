<script lang="ts">
	import IconOisyEmptyState from '$lib/components/icons/IconOisyEmptyState.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="py-12" data-tid="no-transactions-placeholder">
	<div class="mb-5 p-2 flex justify-center">
		<IconOisyEmptyState />
	</div>

	<div class="space-y-4">
		<p class="m-0 text-lg font-bold text-center">{$i18n.transactions.text.transaction_history}</p>
		<p class="m-0 text-center text-black opacity-50">
			{$i18n.transactions.text.buy_or_receive}
		</p>
	</div>
</div>
