<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import BtcTransactionModal from '$btc/components/transactions/BtcTransactionModal.svelte';
	import type { BtcTransactionUi } from '$btc/types/btc';
	import EthTransactionModal from '$eth/components/transactions/EthTransactionModal.svelte';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import IcTransactionModal from '$icp/components/transactions/IcTransactionModal.svelte';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import IconList from '$lib/components/icons/IconList.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import StakeTransaction from '$lib/components/stake/StakeTransaction.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		modalBtcTransaction,
		modalEthTransaction,
		modalIcTransaction,
		modalSolTransaction
	} from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type {
		AnyTransactionUiWithToken,
		StakingTransactionsUiWithToken
	} from '$lib/types/transaction-ui';
	import {
		isNetworkIdBitcoin,
		isNetworkIdEthereum,
		isNetworkIdEvm,
		isNetworkIdICP,
		isNetworkIdSolana
	} from '$lib/utils/network.utils';
	import { mapTransactionModalData } from '$lib/utils/transaction.utils';
	import { sortTransactions } from '$lib/utils/transactions.utils';
	import SolTransactionModal from '$sol/components/transactions/SolTransactionModal.svelte';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';

	interface Props {
		transactions: StakingTransactionsUiWithToken[];
		testId?: string;
	}

	const { transactions, testId }: Props = $props();

	const sortedTransactions = $derived(
		[...transactions].sort((a, b) => sortTransactions({ transactionA: a, transactionB: b }))
	);

	let expanded = $state(false);

	let { transaction: selectedBtcTransaction, token: selectedBtcToken } = $derived(
		mapTransactionModalData<BtcTransactionUi>({
			$modalOpen: $modalBtcTransaction,
			$modalStore
		})
	);

	let { transaction: selectedEthTransaction, token: selectedEthToken } = $derived(
		mapTransactionModalData<EthTransactionUi>({
			$modalOpen: $modalEthTransaction,
			$modalStore
		})
	);

	let { transaction: selectedIcTransaction, token: selectedIcToken } = $derived(
		mapTransactionModalData<IcTransactionUi>({
			$modalOpen: $modalIcTransaction,
			$modalStore
		})
	);

	let { transaction: selectedSolTransaction, token: selectedSolToken } = $derived(
		mapTransactionModalData<SolTransactionUi>({
			$modalOpen: $modalSolTransaction,
			$modalStore
		})
	);

	const openModal = (transaction: AnyTransactionUiWithToken) => {
		const { id: networkId } = transaction.token.network;
		if (isNetworkIdICP(networkId)) {
			modalStore.openIcTransaction({
				id: Symbol(),
				data: { transaction: transaction as IcTransactionUi, token: transaction.token }
			});
		} else if (isNetworkIdSolana(networkId)) {
			modalStore.openSolTransaction({
				id: Symbol(),
				data: { transaction: transaction as SolTransactionUi, token: transaction.token }
			});
		} else if (isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)) {
			modalStore.openEthTransaction({
				id: Symbol(),
				data: { transaction: transaction as EthTransactionUi, token: transaction.token }
			});
		} else if (isNetworkIdBitcoin(networkId)) {
			modalStore.openBtcTransaction({
				id: Symbol(),
				data: { transaction: transaction as BtcTransactionUi, token: transaction.token }
			});
		}
	};
</script>

{#if sortedTransactions.length > 0}
	<StakeContentSection>
		{#snippet title()}
			<h4>{$i18n.navigation.text.activity}</h4>
		{/snippet}
		{#snippet content()}
			{#each expanded ? sortedTransactions : sortedTransactions.slice(0, 5) as transaction, index (`${index}-${transaction.timestamp}`)}
				<StakeTransaction
					onClick={() => openModal(transaction)}
					testId={`${testId}-transaction-${index}`}
					{transaction}
				/>
			{/each}

			{#if sortedTransactions.length > 5}
				<Button
					colorStyle="muted"
					fullWidth
					innerStyleClass="items-center"
					onclick={() => (expanded = !expanded)}
					paddingSmall
					styleClass="text-brand-primary hover:bg-transparent hover:text-brand-secondary"
					testId={`${testId}-expand-transactions-button`}
					transparent
				>
					<IconList />
					{expanded ? $i18n.stake.text.recent_history : $i18n.stake.text.full_history}
				</Button>
			{/if}
		{/snippet}
	</StakeContentSection>

	{#if $modalBtcTransaction && nonNullish(selectedBtcTransaction)}
		<BtcTransactionModal token={selectedBtcToken} transaction={selectedBtcTransaction} />
	{:else if $modalEthTransaction && nonNullish(selectedEthTransaction)}
		<EthTransactionModal token={selectedEthToken} transaction={selectedEthTransaction} />
	{:else if $modalIcTransaction && nonNullish(selectedIcTransaction)}
		<IcTransactionModal token={selectedIcToken} transaction={selectedIcTransaction} />
	{:else if $modalSolTransaction && nonNullish(selectedSolTransaction)}
		<SolTransactionModal token={selectedSolToken} transaction={selectedSolTransaction} />
	{/if}
{/if}
