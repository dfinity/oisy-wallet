<script lang="ts">
	import IconSearchClose from '$lib/components/icons/lucide/IconSearchClose.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div class="py-12" data-tid="ic-no-index-placeholder">
	<div class="mb-5 flex justify-center">
		<RoundedIcon icon={IconSearchClose} />
	</div>

	<div class="space-y-4">
		<p class="m-0 text-center text-lg font-bold">
			{$i18n.transactions.text.transaction_history_unavailable}
		</p>
		<p class="text-secondary m-0 text-center opacity-50">
			{replaceOisyPlaceholders($i18n.transactions.text.missing_index_canister_explanation)}
		</p>
	</div>
</div>
