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
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		visible: boolean;
	}

	let { visible = $bindable() }: Props = $props();

	type FilterStep = 'root' | 'types' | 'tokens' | 'contacts';

	let step = $state<FilterStep>('root');

	const goToRoot = () => (step = 'root');

	const onClose = () => {
		step = 'root';
	};

	const titleForStep: Record<FilterStep, () => string> = {
		root: () => $i18n.transaction.filter.sheet_title,
		types: () => $i18n.transaction.filter.types_label,
		tokens: () => $i18n.transaction.filter.tokens_label,
		contacts: () => $i18n.transaction.filter.contacts_label
	};

	let title = $derived(titleForStep[step]());
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
					<li>
						<button
							class="flex w-full items-center justify-between rounded-md px-3 py-3 text-left transition hover:bg-brand-subtle-10"
							onclick={() => (step = 'types')}
							type="button"
						>
							<span class="flex items-center gap-3 text-sm">
								<IconListFilter size="20" />
								{$i18n.transaction.filter.types_label}
							</span>
							<span class="flex items-center gap-2">
								{#if $selectedTransactionsFilterTypesCount > 0}
									<Badge variant="info" width="w-fit">{$selectedTransactionsFilterTypesCount}</Badge
									>
								{/if}
								<IconChevronRight size="20" />
							</span>
						</button>
					</li>
					<li>
						<button
							class="flex w-full items-center justify-between rounded-md px-3 py-3 text-left transition hover:bg-brand-subtle-10"
							onclick={() => (step = 'tokens')}
							type="button"
						>
							<span class="flex items-center gap-3 text-sm">
								<IconCoins size="20" />
								{$i18n.transaction.filter.tokens_label}
							</span>
							<span class="flex items-center gap-2">
								{#if $selectedTransactionsFilterTokensCount > 0}
									<Badge variant="info" width="w-fit"
										>{$selectedTransactionsFilterTokensCount}</Badge
									>
								{/if}
								<IconChevronRight size="20" />
							</span>
						</button>
					</li>
					<li>
						<button
							class="flex w-full items-center justify-between rounded-md px-3 py-3 text-left transition hover:bg-brand-subtle-10"
							onclick={() => (step = 'contacts')}
							type="button"
						>
							<span class="flex items-center gap-3 text-sm">
								<IconUserSquare size="20" />
								{$i18n.transaction.filter.contacts_label}
							</span>
							<span class="flex items-center gap-2">
								{#if $selectedTransactionsFilterContactsCount > 0}
									<Badge variant="info" width="w-fit"
										>{$selectedTransactionsFilterContactsCount}</Badge
									>
								{/if}
								<IconChevronRight size="20" />
							</span>
						</button>
					</li>
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
