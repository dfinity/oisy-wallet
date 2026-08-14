<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import IconConvert from '$lib/components/icons/IconConvert.svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Collapsible from '$lib/components/ui/Collapsible.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import SolTransaction from '$sol/components/transactions/SolTransaction.svelte';
	import type { SolTransactionGroup } from '$sol/types/sol-transaction-group';

	interface Props {
		group: SolTransactionGroup;
		testId?: string;
	}

	let { group, testId }: Props = $props();

	let { transactions, legs, isSwap } = $derived(group);

	// Every row of the group is the same transaction on the same network, so the first one speaks
	// for all of them.
	let network = $derived(transactions[0]?.token.network);

	// A swap is the only shape the netting can name. Everything else is called what it provably is,
	// one transaction that moved several things, rather than given a guessed label.
	let label = $derived(
		isSwap ? $i18n.transactions.text.grouped_swap : $i18n.transactions.text.grouped_bundle
	);
</script>

<Collapsible expandButton testId={testId ?? 'sol-transactions-group'} wrapHeight>
	{#snippet header()}
		<span class="block w-full rounded-xl px-2 py-2">
			<Card noMargin withGap>
				<span class="flex min-w-0 flex-1 basis-0 items-center gap-1">
					<span class="truncate" data-tid="sol-transactions-group-label">{label}</span>

					{#if nonNullish(network)}
						<div class="shrink-0">
							<NetworkLogo {network} transparent />
						</div>
					{/if}
				</span>

				{#snippet icon()}
					<div>
						<RoundedIcon icon={IconConvert} size="16" />
					</div>
				{/snippet}

				{#snippet amount()}
					<span class="flex flex-col items-end">
						{#if $isPrivacyMode}
							<IconDots />
						{:else}
							{#each legs as { symbol, decimals, net } (symbol)}
								<span data-tid={`sol-transactions-group-leg-${symbol}`}>
									<Amount amount={net} {decimals} formatPositiveAmount {symbol} />
								</span>
							{/each}
						{/if}
					</span>
				{/snippet}

				{#snippet description()}
					<span class="flex min-w-0 text-xs text-tertiary sm:text-sm">
						{replacePlaceholders($i18n.transactions.text.grouped_count, {
							$count: `${transactions.length}`
						})}
					</span>
				{/snippet}
			</Card>
		</span>
	{/snippet}

	{#each transactions as transactionUi, index (`${transactionUi.transaction.id}-${transactionUi.token.id.description}-${index}`)}
		{@const { token, transaction } = transactionUi}

		<div class="pl-6" in:slide={SLIDE_DURATION}>
			<SolTransaction iconType="token" {token} {transaction} />
		</div>
	{/each}
</Collapsible>
