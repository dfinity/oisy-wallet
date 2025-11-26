<script lang="ts">
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate, goto } from '$app/navigation';
	import { EARNING_ENABLED } from '$env/earning';
	import GldtInfoBox from '$icp/components/stake/gldt/GldtInfoBox.svelte';
	import GldtStakeEarnCard from '$icp/components/stake/gldt/GldtStakeEarnCard.svelte';
	import GldtStakePositionCard from '$icp/components/stake/gldt/GldtStakePositionCard.svelte';
	import GldtStakeRewards from '$icp/components/stake/gldt/GldtStakeRewards.svelte';
	import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
	import { gldtStakeStore } from '$icp/stores/gldt-stake.store';
	import { isGLDTToken } from '$icp-eth/utils/token.utils';
	import IconBackArrow from '$lib/components/icons/lucide/IconBackArrow.svelte';
	import StakeProviderContainer from '$lib/components/stake/StakeProviderContainer.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { StakeProvider } from '$lib/types/stake';
	import { networkUrl } from '$lib/utils/nav.utils';
	import { icTransactions } from '$icp/derived/ic-transactions.derived';
	import { getAllIcTransactions } from '$icp/utils/ic-transactions.utils';
	import { nonNullish } from '@dfinity/utils';
	import { ckBtcPendingUtxoTransactions } from '$icp/derived/ckbtc-transactions.derived';
	import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
	import { ckEthPendingTransactions } from '$icp/derived/cketh-transactions.derived';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { btcStatusesStore } from '$icp/stores/btc.store';
	import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});

	let gldtToken = $derived($enabledIcrcTokens.find(isGLDTToken));
	let goldaoToken = $derived($enabledIcrcTokens.find((t) => t.id.description === 'GOLDAO'));

	let transactions: IcTransactionUi[] = $derived(
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
					}),
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
					})
				].map((t) => t.data)
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
								path: AppPath.Earning,
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

	<GldtStakeRewards />
	<GldtInfoBox />
</div>
