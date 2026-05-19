<script lang="ts">
	import IconBackArrow from '$lib/components/icons/lucide/IconBackArrow.svelte';
	import IconChevronRight from '$lib/components/icons/lucide/IconChevronRight.svelte';
	import IconCoins from '$lib/components/icons/lucide/IconCoins.svelte';
	import IconListFilter from '$lib/components/icons/lucide/IconListFilter.svelte';
	import IconUserSquare from '$lib/components/icons/lucide/IconUserSquare.svelte';
	import TransactionsFilterClearButton from '$lib/components/transactions/filter/TransactionsFilterClearButton.svelte';
	import TransactionsFilterContactsPanel from '$lib/components/transactions/filter/TransactionsFilterContactsPanel.svelte';
	import TransactionsFilterTokensPanel from '$lib/components/transactions/filter/TransactionsFilterTokensPanel.svelte';
	import TransactionsFilterTypesPanel from '$lib/components/transactions/filter/TransactionsFilterTypesPanel.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import {
		selectedTransactionsFilterContactsCount,
		selectedTransactionsFilterTokensCount,
		selectedTransactionsFilterTypesCount
	} from '$lib/derived/transactions-filter.derived';
	import {
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENT_FILTER_MODIFIERS
	} from '$lib/enums/plausible';
	import { trackTransactionFilter } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		visible: boolean;
	}

	let { visible = $bindable() }: Props = $props();

	type FilterStep = 'root' | 'types' | 'tokens' | 'contacts';

	const FILTER_KEY_BY_STEP: Record<Exclude<FilterStep, 'root'>, PLAUSIBLE_EVENT_EVENTS_KEYS> = {
		types: PLAUSIBLE_EVENT_EVENTS_KEYS.TRANSACTION_TYPE,
		tokens: PLAUSIBLE_EVENT_EVENTS_KEYS.TOKEN,
		contacts: PLAUSIBLE_EVENT_EVENTS_KEYS.CONTACT
	};

	const trackStepOpen = (next: Exclude<FilterStep, 'root'>) => {
		trackTransactionFilter({
			modifier: PLAUSIBLE_EVENT_FILTER_MODIFIERS.OPEN,
			key: FILTER_KEY_BY_STEP[next]
		});
	};

	const trackStepClose = (previous: Exclude<FilterStep, 'root'>) => {
		trackTransactionFilter({
			modifier: PLAUSIBLE_EVENT_FILTER_MODIFIERS.CLOSE,
			key: FILTER_KEY_BY_STEP[previous]
		});
	};

	let step = $state<FilterStep>('root');

	const enterStep = (next: Exclude<FilterStep, 'root'>) => {
		trackStepOpen(next);
		step = next;
	};

	const goToRoot = () => {
		if (step !== 'root') {
			trackStepClose(step);
		}
		step = 'root';
	};

	const onClose = () => {
		// Sheet dismissed: if the user was inside a sub-step, we still emit
		// the matching close event so dashboards see balanced open/close pairs.
		if (step !== 'root') {
			trackStepClose(step);
		}
		step = 'root';
	};

	const titleForStep: Record<FilterStep, () => string> = {
		root: () => $i18n.transaction.filter.sheet_title,
		types: () => $i18n.transaction.filter.types_label,
		tokens: () => $i18n.transaction.filter.tokens_label,
		contacts: () => $i18n.transaction.filter.contacts_label
	};

	let title = $derived(titleForStep[step]());

	const rows: { step: Exclude<FilterStep, 'root'>; label: string; count: number }[] = $derived([
		{
			step: 'types',
			label: $i18n.transaction.filter.types_label,
			count: $selectedTransactionsFilterTypesCount
		},
		{
			step: 'tokens',
			label: $i18n.transaction.filter.tokens_label,
			count: $selectedTransactionsFilterTokensCount
		},
		{
			step: 'contacts',
			label: $i18n.transaction.filter.contacts_label,
			count: $selectedTransactionsFilterContactsCount
		}
	]);
</script>

<BottomSheet contentClass="min-h-[40vh]" {onClose} bind:visible>
	{#snippet content()}
		<div class="flex w-full flex-col gap-4">
			<div class="flex items-center gap-2">
				{#if step !== 'root'}
					<ButtonIcon
						ariaLabel={$i18n.core.text.back}
						onclick={goToRoot}
						styleClass="text-secondary"
					>
						{#snippet icon()}
							<IconBackArrow />
						{/snippet}
					</ButtonIcon>
				{/if}
				<span class="text-lg font-bold">{title}</span>
			</div>

			{#if step === 'root'}
				<ul class="m-0 flex list-none flex-col gap-1 p-0">
					{#each rows as { step: rowStep, label, count } (rowStep)}
						<li>
							<button
								class="flex w-full items-center justify-between rounded-md px-3 py-3 text-left transition hover:bg-brand-subtle-10"
								onclick={() => enterStep(rowStep)}
								type="button"
							>
								<span class="flex items-center gap-3 text-sm">
									{#if rowStep === 'types'}
										<IconListFilter size="20" />
									{:else if rowStep === 'tokens'}
										<IconCoins size="20" />
									{:else}
										<IconUserSquare size="20" />
									{/if}
									{label}
								</span>
								<span class="flex items-center gap-2">
									{#if count > 0}
										<Badge variant="info" width="w-fit">{count}</Badge>
									{/if}
									<IconChevronRight size="20" />
								</span>
							</button>
						</li>
					{/each}
				</ul>

				<div class="flex justify-center pt-2">
					<TransactionsFilterClearButton />
				</div>
			{:else if step === 'types'}
				<TransactionsFilterTypesPanel />
			{:else if step === 'tokens'}
				<TransactionsFilterTokensPanel />
			{:else if step === 'contacts'}
				<TransactionsFilterContactsPanel />
			{/if}
		</div>
	{/snippet}
</BottomSheet>
