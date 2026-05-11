<script lang="ts">
	import IconListFilter from '$lib/components/icons/lucide/IconListFilter.svelte';
	import TransactionsFilterClearButton from '$lib/components/transactions/filter/TransactionsFilterClearButton.svelte';
	import TransactionsFilterContacts from '$lib/components/transactions/filter/TransactionsFilterContacts.svelte';
	import TransactionsFilterMobileSheet from '$lib/components/transactions/filter/TransactionsFilterMobileSheet.svelte';
	import TransactionsFilterTokens from '$lib/components/transactions/filter/TransactionsFilterTokens.svelte';
	import TransactionsFilterTypes from '$lib/components/transactions/filter/TransactionsFilterTypes.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import NotificationBlob from '$lib/components/ui/NotificationBlob.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { TRANSACTIONS_FILTER_TOOLBAR } from '$lib/constants/test-ids.constants';
	import { hasActiveTransactionsFilter } from '$lib/derived/transactions-filter.derived';
	import { i18n } from '$lib/stores/i18n.store';

	let mobileSheetVisible = $state(false);
</script>

<div class="mb-4 w-full" data-tid={TRANSACTIONS_FILTER_TOOLBAR}>
	<Responsive up="md">
		<div class="flex flex-wrap items-center gap-2">
			<TransactionsFilterTypes />

			<TransactionsFilterTokens />

			<TransactionsFilterContacts />

			<TransactionsFilterClearButton />
		</div>
	</Responsive>

	<Responsive down="sm">
		<div class="flex items-center justify-end gap-2">
			<ButtonIcon
				ariaLabel={$i18n.transaction.filter.open_filters_aria_label}
				colorStyle="muted"
				link={false}
				onclick={() => (mobileSheetVisible = true)}
			>
				{#snippet icon()}
					<NotificationBlob display={$hasActiveTransactionsFilter} position="top-right">
						<IconListFilter size="20" />
					</NotificationBlob>
				{/snippet}
			</ButtonIcon>
		</div>

		<TransactionsFilterMobileSheet bind:visible={mobileSheetVisible} />
	</Responsive>
</div>
