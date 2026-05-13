<script lang="ts">
	import IconListFilter from '$lib/components/icons/lucide/IconListFilter.svelte';
	import TransactionsFilterMobileSheet from '$lib/components/transactions/filter/TransactionsFilterMobileSheet.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import NotificationBlob from '$lib/components/ui/NotificationBlob.svelte';
	import { hasActiveTransactionsFilter } from '$lib/derived/transactions-filter.derived';
	import { i18n } from '$lib/stores/i18n.store';

	let mobileSheetVisible = $state(false);
</script>

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

<TransactionsFilterMobileSheet bind:visible={mobileSheetVisible} />
