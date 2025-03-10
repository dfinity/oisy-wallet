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
	import {
		areTransactionsStoresLoading,
		mapAllTransactionsUi
	} from '$lib/utils/transactions.utils';
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
	import { LOCAL, MILLISECONDS_IN_DAY } from '$lib/constants/app.constants';
	import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
	import { formatNanosecondsToTimestamp } from '$lib/utils/format.utils';
	import type { AllTransactionUiWithCmp } from '$lib/types/transaction';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import { enabledErc20Tokens, enabledIcTokens } from '$lib/derived/tokens.derived';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import type { TransactionsStoreCheckParams } from '$lib/types/transactions';
	import AirdropDateBadge from '$lib/components/airdrops/AirdropDateBadge.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { getRewardRequirementsFulfilled } from '$lib/services/reward-code.services';

	export let airdrop: AirdropDescription;

	// for the moment we evaluate if requirements are fulfilled in frontend
	// this might need to change when we have multiple campaigns etc
	let totalUsdBalance: number;
	$: totalUsdBalance = sumTokensUiUsdBalance($combinedDerivedSortedNetworkTokensUi);

	let transactions: AllTransactionUiWithCmp[];
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

	// hardcoded values, first element is true since you need to have logged in at least once to even
	// see this UI, second criteria is have at least two trxs, third is hold at least 20$
	let requirementsFulfilled: boolean[];
	$: requirementsFulfilled = getRewardRequirementsFulfilled({ transactions, totalUsdBalance });

	let isEligible: boolean = false;
	$: isEligible = requirementsFulfilled.reduce((p, c) => p && c);

	let transactionsStores: TransactionsStoreCheckParams[];
	$: transactionsStores = [
		// We explicitly do not include the Bitcoin transactions store locally, as it may cause lags in the UI.
		// It could take longer time to be initialized and in case of no transactions (for example, a new user), it would be stuck to show the skeletons.
		...(LOCAL
			? []
			: [{ transactionsStoreData: $btcTransactionsStore, tokens: $enabledBitcoinTokens }]),
		{
			transactionsStoreData: $ethTransactionsStore,
			tokens: [...$enabledEthereumTokens, ...$enabledErc20Tokens]
		},
		{ transactionsStoreData: $icTransactionsStore, tokens: $enabledIcTokens },
		{
			transactionsStoreData: $solTransactionsStore,
			tokens: [...$enabledSolanaTokens, ...$enabledSplTokens]
		}
	];
	let isRequirementsLoading = true;
	$: isRequirementsLoading = areTransactionsStoresLoading(transactionsStores);
</script>

<Modal on:nnsClose={modalStore.close}>
	<span class="text-center text-xl" slot="title">{airdrop.title}</span>

	<ContentWithToolbar>
		<AirdropBanner />

		<AirdropEarnings {isEligible} />
		{#if isEligible}
			<Hr spacing="md" />
		{/if}

		<div class="flex w-full justify-between text-lg font-semibold"
			><span class="inline-flex">{$i18n.airdrops.text.participate_title}</span>
			<span class="inline-flex"><AirdropDateBadge date={airdrop.endDate} /></span></div
		>
		<p class="my-3">{airdrop.description}</p>

		<ExternalLink
			href={airdrop.learnMoreHref}
			ariaLabel={$i18n.airdrops.text.learn_more}
			iconVisible={false}
			asButton
			styleClass={`rounded-xl px-3 py-2 secondary-light mb-3`}
		>
			{$i18n.airdrops.text.learn_more}
		</ExternalLink>

		<Share text={$i18n.airdrops.text.share} href={airdrop.campaignHref} styleClass="my-2" />

		{#if airdrop.requirements.length > 0}
			<Hr spacing="md" />
		{/if}
		<AirdropsRequirements
			loading={isRequirementsLoading}
			{airdrop}
			{isEligible}
			{requirementsFulfilled}
		/>

		<Button paddingSmall type="button" fullWidth on:click={modalStore.close} slot="toolbar">
			{$i18n.airdrops.text.modal_button_text}
		</Button>
	</ContentWithToolbar>
</Modal>
