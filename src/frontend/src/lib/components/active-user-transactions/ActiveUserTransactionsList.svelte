<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import ActiveUserTransactionItem from '$lib/components/active-user-transactions/ActiveUserTransactionItem.svelte';
	import {
		activeUserTransactionsFailed,
		activeUserTransactionsList,
		activeUserTransactionsPending,
		activeUserTransactionsSucceeded
	} from '$lib/derived/active-user-transactions.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { deleteActiveUserTransaction } from '$lib/services/active-user-transactions.services';
	import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { isActiveUserTransactionUnseen } from '$lib/utils/active-user-transactions.utils';

	let dismissing = $state<Record<string, boolean>>({});

	const dismiss = async (id: string) => {
		if (isNullish($authIdentity)) {
			return;
		}

		dismissing = { ...dismissing, [id]: true };

		try {
			await deleteActiveUserTransaction({ identity: $authIdentity, id });
		} catch (err: unknown) {
			const { [id]: _, ...rest } = dismissing;

			dismissing = rest;

			toastsError({
				msg: { text: $i18n.active_user_transactions.error.dismiss_failed },
				err
			});
		}
	};

	const groups = $derived([
		{
			title: $i18n.active_user_transactions.text.section_in_progress,
			transactions: $activeUserTransactionsPending
		},
		{
			title: $i18n.active_user_transactions.text.section_failed,
			transactions: $activeUserTransactionsFailed
		},
		{
			title: $i18n.active_user_transactions.text.section_previous,
			transactions: $activeUserTransactionsSucceeded
		}
	]);
</script>

<div class="flex w-full flex-col gap-2">
	{#if $activeUserTransactionsList.length === 0}
		<p class="py-4 text-center opacity-60">{$i18n.active_user_transactions.text.empty}</p>
	{:else}
		{#each groups as { title, transactions } (title)}
			{#if transactions.length > 0}
				<div class="mb-4 flex flex-col gap-2 last:mb-0">
					<div class="text-sm font-semibold">
						{title}
					</div>
					<ul class="list-none">
						{#each transactions as tx (tx.id)}
							<ActiveUserTransactionItem
								dismissing={dismissing[tx.id] ?? false}
								isUnseen={isActiveUserTransactionUnseen({
									state: $activeUserTransactionsStore,
									tx
								})}
								onDismiss={() => dismiss(tx.id)}
								{tx}
							/>
						{/each}
					</ul>
				</div>
			{/if}
		{/each}
	{/if}
</div>
