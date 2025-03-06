<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import AirdropBanner from '$lib/components/airdrops/AirdropBanner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Share from '$lib/components/ui/Share.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { mapAllTransactionsUi } from '$lib/utils/transactions.utils';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { ethAddress } from '$lib/derived/address.derived';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { btcStatusesStore } from '$icp/stores/btc.store';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
	import AirdropsRequirements from '$lib/components/airdrops/AirdropsRequirements.svelte';
	import AirdropEarnings from '$lib/components/airdrops/AirdropEarnings.svelte';
	import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';
	import {
		combinedDerivedSortedNetworkTokensUi,
		enabledNetworkTokens
	} from '$lib/derived/network-tokens.derived';
	import { MILLISECONDS_IN_DAY } from '$lib/constants/app.constants';
	import { formatNanosecondsToTimestamp } from '$lib/utils/format.utils';

	export let airdrop: AirdropDescription;

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

	let isEligible: boolean = false;
	$: isEligible = requirementsFulfilled.reduce((p, c) => p && c);

	// hardcoded values, first element is true since you need to have logged in at least once to even
	// see this UI, second criteria is have at least two trxs, third is hold at least 20$
	let requirementsFulfilled: boolean[];
	$: requirementsFulfilled = [true, transactionsLength >= 2, totalUsd >= 1];
</script>

<Modal on:nnsClose={modalStore.close}>
	<span class="text-center text-xl" slot="title">{airdrop.title}</span>

	<ContentWithToolbar>
		<AirdropBanner />

		<AirdropEarnings {isEligible} />

		<span class="text-lg font-semibold">{$i18n.airdrops.text.participate_title}</span>
		<p class="mb-0 mt-2">{airdrop.description}</p>

		<ExternalLink
			href={airdrop.learnMoreHref}
			ariaLabel={$i18n.airdrops.text.learn_more}
			iconVisible={false}
			asButton
			styleClass={`rounded-xl px-3 py-2 secondary-light`}
		>
			{$i18n.airdrops.text.learn_more}
		</ExternalLink>

		<Share text={$i18n.airdrops.text.share} href={airdrop.campaignHref} styleClass="mt-2" />

		<AirdropsRequirements {airdrop} {isEligible} {requirementsFulfilled} />

		<Button paddingSmall type="button" fullWidth on:click={modalStore.close} slot="toolbar">
			{$i18n.airdrops.text.modal_button_text}
		</Button>
	</ContentWithToolbar>
</Modal>
