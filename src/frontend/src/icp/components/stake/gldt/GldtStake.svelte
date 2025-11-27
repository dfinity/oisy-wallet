<script lang="ts">
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate, goto } from '$app/navigation';
	import { EARNING_ENABLED } from '$env/earning';
	import GldtInfoBox from '$icp/components/stake/gldt/GldtInfoBox.svelte';
	import GldtStakeDissolveEvents from '$icp/components/stake/gldt/GldtStakeDissolveEvents.svelte';
	import GldtStakeEarnCard from '$icp/components/stake/gldt/GldtStakeEarnCard.svelte';
	import GldtStakePositionCard from '$icp/components/stake/gldt/GldtStakePositionCard.svelte';
	import GldtStakeRewards from '$icp/components/stake/gldt/GldtStakeRewards.svelte';
	import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
	import { gldtStakeStore } from '$icp/stores/gldt-stake.store';
	import { isGLDTToken, isGoldaoToken } from '$icp-eth/utils/token.utils';
	import IconBackArrow from '$lib/components/icons/lucide/IconBackArrow.svelte';
	import StakeProviderContainer from '$lib/components/stake/StakeProviderContainer.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { StakeProvider } from '$lib/types/stake';
	import { networkUrl } from '$lib/utils/nav.utils';
	import { getAllIcTransactions } from '$icp/utils/ic-transactions.utils';
	import { nonNullish } from '@dfinity/utils';
	import { ckBtcPendingUtxoTransactions } from '$icp/derived/ckbtc-transactions.derived';
	import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
	import { ckEthPendingTransactions } from '$icp/derived/cketh-transactions.derived';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { btcStatusesStore } from '$icp/stores/btc.store';
	import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import StakeTransactions from '$lib/components/stake/StakeTransactions.svelte';
	import type { StakingTransactionsUiWithToken } from '$lib/types/transaction-ui';
	import { GLDT_STAKE_CANISTER_ID } from '$lib/constants/app.constants';
	import { sortTransactions } from '$lib/utils/transactions.utils';

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});

	let gldtToken = $derived($enabledIcrcTokens.find(isGLDTToken));
	let goldaoToken = $derived($enabledIcrcTokens.find(isGoldaoToken));

	let transactions: StakingTransactionsUiWithToken[] = $derived(
		nonNullish(gldtToken) && nonNullish(goldaoToken)
			? [
					...getAllIcTransactions({
						token: gldtToken,
						ckBtcPendingUtxoTransactions: $ckBtcPendingUtxoTransactions,
						ckBtcPendingUtxosStore: $ckBtcPendingUtxosStore,
						ckEthPendingTransactions: $ckEthPendingTransactions,
						ckBtcMinterInfoStore: $ckBtcMinterInfoStore,
						btcStatusesStore: $btcStatusesStore,
						icPendingTransactionsStore: $icPendingTransactionsStore,
						icExtendedTransactions: [],
						icTransactionsStore: $icTransactionsStore
					}).map(({ data: t }) => ({ ...t, isReward: false, token: gldtToken })),
					...getAllIcTransactions({
						token: goldaoToken,
						ckBtcPendingUtxoTransactions: $ckBtcPendingUtxoTransactions,
						ckBtcPendingUtxosStore: $ckBtcPendingUtxosStore,
						ckEthPendingTransactions: $ckEthPendingTransactions,
						ckBtcMinterInfoStore: $ckBtcMinterInfoStore,
						btcStatusesStore: $btcStatusesStore,
						icPendingTransactionsStore: $icPendingTransactionsStore,
						icExtendedTransactions: [],
						icTransactionsStore: $icTransactionsStore
					}).map(({ data: t }) => ({ ...t, isReward: true, token: goldaoToken }))
				]
					.filter(
						({ from, to }) =>
							from?.includes(GLDT_STAKE_CANISTER_ID) || to?.includes(GLDT_STAKE_CANISTER_ID)
					)
					.sort((a, b) => sortTransactions({ transactionA: a, transactionB: b }))
			: []
	);

	$effect(() => {
		console.log('filtered transactions', transactions);
	});
</script>

<div class="flex flex-col gap-6 pb-6">
	<StakeProviderContainer currentApy={$gldtStakeStore?.apy} provider={StakeProvider.GLDT}>
		{#snippet backButton()}
			{#if EARNING_ENABLED}
				<ButtonIcon
					ariaLabel="icon"
					colorStyle="tertiary"
					link={false}
					onclick={() =>
						goto(
							networkUrl({
								path: AppPath.Earn,
								networkId: $networkId,
								usePreviousRoute: true,
								fromRoute
							})
						)}
				>
					{#snippet icon()}
						<IconBackArrow />
					{/snippet}
				</ButtonIcon>
			{/if}
		{/snippet}

		{#snippet content()}
			<div class="mt-6 flex flex-col justify-between gap-4 sm:flex-row">
				<GldtStakeEarnCard {gldtToken} />
				<GldtStakePositionCard {gldtToken} />
			</div>
		{/snippet}
	</StakeProviderContainer>

	<GldtStakeDissolveEvents {gldtToken} />
	<GldtStakeRewards />
	<StakeTransactions {transactions} />
	<GldtInfoBox />
</div>
