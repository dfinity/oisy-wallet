<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import { SOL_SUMMARY_ENABLED } from '$env/sol-summary.env';
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
	import SolSummary from '$sol/components/core/SolSummary.svelte';
	import SolTransaction from '$sol/components/transactions/SolTransaction.svelte';
	import type { SolTransactionGroup } from '$sol/types/sol-transaction-group';
	import { toSolTransactionGroupSummaryFacts } from '$sol/utils/sol-summary.utils';

	interface Props {
		group: SolTransactionGroup;
		testId?: string;
	}

	let { group, testId }: Props = $props();

	let { transactions, legs, isSwap } = $derived(group);

	let collapsible = $state<ReturnType<typeof Collapsible> | undefined>();

	// The sentence costs an update call to the LLM canister, so it is asked for when the user opens
	// the group and never for a row they only scrolled past. Once asked, it stays mounted:
	// collapsing hides it, and re-expanding must not pay for it twice.
	//
	// Driven by the toggle callback rather than by a binding, because the children of a collapsible
	// are rendered whether or not it is open: only the callback says the user actually opened it.
	let requested = $state(false);

	let facts = $derived(toSolTransactionGroupSummaryFacts(group));

	// Every row of the group is the same transaction on the same network, so the first one speaks
	// for all of them.
	let network = $derived(transactions[0]?.token.network);

	// A swap is the only shape the netting can name. Everything else is called what it provably is,
	// one transaction that moved several things, rather than given a guessed label.
	let label = $derived(
		isSwap ? $i18n.transactions.text.grouped_swap : $i18n.transactions.text.grouped_bundle
	);
</script>

<Collapsible
	bind:this={collapsible}
	expandButton
	onToggle={({ expanded }) => {
		requested = requested || expanded;
	}}
	testId={testId ?? 'sol-transactions-group'}
	wrapHeight
>
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

	{#if SOL_SUMMARY_ENABLED && requested}
		<div class="pb-2">
			<SolSummary {facts} onRendered={() => collapsible?.updateMaxHeight()} />
		</div>
	{/if}

	{#each transactions as transactionUi, index (`${transactionUi.transaction.id}-${transactionUi.token.id.description}-${index}`)}
		{@const { token, transaction } = transactionUi}

		<div class="pl-6" in:slide={SLIDE_DURATION}>
			<SolTransaction iconType="token" {token} {transaction} />
		</div>
	{/each}
</Collapsible>
