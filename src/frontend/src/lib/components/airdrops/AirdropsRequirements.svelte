<script lang="ts">
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import { i18n } from '$lib/stores/i18n.store';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { IconCheckCircle } from '@dfinity/gix-components';
	import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';
	import {
		combinedDerivedSortedNetworkTokensUi,
		enabledNetworkTokens
	} from '$lib/derived/network-tokens.derived';
	import { mapAllTransactionsUi } from '$lib/utils/transactions.utils';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { ethAddress } from '$lib/derived/address.derived';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { btcStatusesStore } from '$icp/stores/btc.store';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { formatNanosecondsToTimestamp } from '$lib/utils/format.utils';
	import { MILLISECONDS_IN_DAY } from '$lib/constants/app.constants';

	export let airdrop: AirdropDescription;
	export let badgeOnly: boolean = false;

	// for the moment we evaluate if requirements are fulfilled in frontend
	// this might need to change when we have multiple campaigns etc
	let totalUsd: number;
	$: totalUsd = sumTokensUiUsdBalance($combinedDerivedSortedNetworkTokensUi);

	let transactions: any[];
	$: transactions = mapAllTransactionsUi({
		tokens: $enabledNetworkTokens,
		$btcTransactions: $btcTransactionsStore,
		$ethTransactions: $ethTransactionsStore,
		$ckEthMinterInfo: $ckEthMinterInfoStore,
		$ethAddress: $ethAddress,
		$icTransactions: $icTransactionsStore,
		$btcStatuses: $btcStatusesStore,
		$solTransactions: $solTransactionsStore
	});

	let transactionsLength: number;
	$: transactionsLength = transactions.filter((trx) =>
		trx.transaction.timestamp
			? new Date().getTime() - MILLISECONDS_IN_DAY * 7 <
				formatNanosecondsToTimestamp(trx.transaction.timestamp)
			: false
	).length;

	$: console.log(totalUsd);

	let isEligible: boolean;
	$: isEligible = requirementsFulfilled.reduce((p, c) => p && c);

	// hardcoded values, first element is true since you need to have logged in at least once to even
	// see this UI, second criteria is have at least two trxs, third is hold at least 20$
	let requirementsFulfilled: boolean[];
	$: requirementsFulfilled = [true, transactionsLength >= 2, totalUsd >= 20];
</script>

{#if airdrop.requirements.length > 0}
	{#if badgeOnly}
		{#if isEligible}<span class="inline-flex pl-3"
				><Badge variant="success">Youre eligible!</Badge></span
			>{/if}
	{:else}
		<Hr spacing="md" />

		<span class="text-md font-semibold"
			>{$i18n.airdrops.text.requirements_title}
		</span>{#if isEligible}<span class="inline-flex pl-3"
				><Badge variant="success">Youre eligible!</Badge></span
			>{/if}
		<ul class="list-none">
			{#each airdrop.requirements as requirement, i}
				<li class="mt-2 flex gap-2">
					{#if requirementsFulfilled[i]}
						<span class="text-success-primary"><IconCheckCircle /></span>
					{:else}
						<IconCheckCircle />
					{/if}
					<span>{requirement}</span>
				</li>
			{/each}
		</ul>
	{/if}
{/if}
