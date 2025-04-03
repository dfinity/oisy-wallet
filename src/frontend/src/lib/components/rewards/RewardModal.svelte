<script lang="ts">
	import { Html, Modal } from '@dfinity/gix-components';
	import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import type { RewardDescription } from '$env/types/env-reward';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { btcStatusesStore } from '$icp/stores/btc.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import RewardBanner from '$lib/components/rewards/RewardBanner.svelte';
	import RewardDateBadge from '$lib/components/rewards/RewardDateBadge.svelte';
	import RewardEarnings from '$lib/components/rewards/RewardEarnings.svelte';
	import RewardsRequirements from '$lib/components/rewards/RewardsRequirements.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import Share from '$lib/components/ui/Share.svelte';
	import { LOCAL } from '$lib/constants/app.constants';
	import { REWARDS_MODAL, REWARDS_MODAL_DATE_BADGE } from '$lib/constants/test-ids.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import {
		combinedDerivedSortedNetworkTokensUi,
		enabledNetworkTokens
	} from '$lib/derived/network-tokens.derived';
	import { enabledErc20Tokens, enabledIcTokens } from '$lib/derived/tokens.derived';
	import { getRewardRequirementsFulfilled } from '$lib/services/reward.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { AllTransactionUiWithCmp } from '$lib/types/transaction';
	import type { TransactionsStoreCheckParams } from '$lib/types/transactions';
	import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';
	import {
		areTransactionsStoresLoading,
		mapAllTransactionsUi
	} from '$lib/utils/transactions.utils';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';

	export let reward: RewardDescription;

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

	let requirementsFulfilled: boolean[];
	$: requirementsFulfilled = getRewardRequirementsFulfilled({ transactions, totalUsdBalance });

	let isEligible = false;
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

	let amountOfRewards = 0;
</script>

<Modal on:nnsClose={modalStore.close} testId={REWARDS_MODAL}>
	<span class="text-center text-xl" slot="title">{reward.title}</span>

	<ContentWithToolbar>
		<RewardBanner />

		<RewardEarnings bind:amountOfRewards />
		{#if amountOfRewards > 0}
			<Hr spacing="md" />
		{/if}

		<div class="flex w-full justify-between text-lg font-semibold">
			<span class="inline-flex">{$i18n.rewards.text.participate_title}</span>
			<span class="inline-flex">
				<RewardDateBadge date={reward.endDate} testId={REWARDS_MODAL_DATE_BADGE} />
			</span>
		</div>
		<p class="my-3"><Html text={reward.description} /></p>

		<ExternalLink
			href={reward.learnMoreHref}
			ariaLabel={$i18n.rewards.text.learn_more}
			iconVisible={false}
			asButton
			styleClass="rounded-xl px-3 py-2 secondary-light mb-3"
		>
			{$i18n.rewards.text.learn_more}
		</ExternalLink>

		<Share text={$i18n.rewards.text.share} href={reward.campaignHref} styleClass="my-2" />

		{#if reward.requirements.length > 0}
			<Hr spacing="md" />

			<RewardsRequirements
				loading={isRequirementsLoading}
				{reward}
				{isEligible}
				{requirementsFulfilled}
			/>
		{/if}

		<Button paddingSmall type="button" fullWidth on:click={modalStore.close} slot="toolbar">
			{$i18n.rewards.text.modal_button_text}
		</Button>
	</ContentWithToolbar>
</Modal>
