<script lang="ts">
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import type {
		AnyTransactionUiWithToken,
		StakingTransactionsUiWithToken
	} from '$lib/types/transaction-ui';
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { NANO_SECONDS_IN_SECOND } from '$lib/constants/app.constants';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		modalBtcTransaction,
		modalEthTransaction,
		modalIcTransaction,
		modalSolTransaction
	} from '$lib/derived/modal.derived';
	import BtcTransactionModal from '$btc/components/transactions/BtcTransactionModal.svelte';
	import EthTransactionModal from '$eth/components/transactions/EthTransactionModal.svelte';
	import IcTransactionModal from '$icp/components/transactions/IcTransactionModal.svelte';
	import SolTransactionModal from '$sol/components/transactions/SolTransactionModal.svelte';
	import { mapTransactionModalData } from '$lib/utils/transaction.utils';
	import type { BtcTransactionUi } from '$btc/types/btc';
	import type { EthTransactionUi } from '$eth/types/eth-transaction';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		isNetworkIdBitcoin,
		isNetworkIdEthereum,
		isNetworkIdEvm,
		isNetworkIdICP,
		isNetworkIdSolana
	} from '$lib/utils/network.utils';
	import IconList from '$lib/components/icons/IconList.svelte';

	interface Props {
		transactions: StakingTransactionsUiWithToken[];
	}

	const { transactions }: Props = $props();

	const getTimestamp = (timestampNanoseconds?: bigint | number) =>
		nonNullish(timestampNanoseconds)
			? Number(BigInt(timestampNanoseconds) / NANO_SECONDS_IN_SECOND)
			: undefined;

	const getTo = (transaction: StakingTransactionsUiWithToken): string | undefined => {
		return nonNullish(transaction.to) && transaction.to.length > 0
			? (transaction.to[0] as string)
			: nonNullish(transaction.to) && transaction.to.length === 0
				? (transaction.to as string)
				: undefined;
	};

	const getStatus = (transaction: StakingTransactionsUiWithToken) => {
		if ('status' in transaction && nonNullish(transaction.status)) {
			return transaction.status === 'confirmed' ||
				transaction.status === 'executed' ||
				transaction.status === 'finalized' ||
				transaction.status === 'processed'
				? 'confirmed'
				: transaction.status === 'pending'
					? 'pending'
					: 'unconfirmed';
		}
		return 'unconfirmed';
	};

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

	const getDisplayAmount = (transaction: StakingTransactionsUiWithToken) =>
		'incoming' in transaction &&
		transaction.incoming &&
		!transaction.isReward &&
		nonNullish(transaction.value)
			? (transaction.value +
					('fee' in transaction && nonNullish(transaction.fee) ? transaction.fee : 0n)) *
				-1n
			: nonNullish(transaction.value)
				? transaction.value
				: undefined;
</script>

{#if transactions.length > 0}
	<StakeContentSection>
		{#snippet title()}
			<h4>Activity</h4>
		{/snippet}
		{#snippet content()}
			{#each expanded ? transactions : transactions.slice(0, 5) as transaction}
				<Transaction
					type={transaction.type}
					token={transaction.token}
					status={getStatus(transaction)}
					iconType="token"
					timestamp={getTimestamp(transaction.timestamp)}
					from={transaction.from}
					to={getTo(transaction)}
					displayAmount={getDisplayAmount(transaction)}
					onClick={() => openModal(transaction)}
				>
					{#if 'incoming' in transaction && transaction.incoming}
						{#if transaction.isReward}
							Reward claimed
						{:else}
							Unstaked
						{/if}
					{:else}
						Staked
					{/if}
				</Transaction>
			{/each}

			{#if transactions.length > 5}
				<Button
					colorStyle="muted"
					fullWidth
					innerStyleClass="items-center"
					onclick={() => (expanded = !expanded)}
					paddingSmall
					styleClass="text-brand-primary hover:bg-transparent hover:text-brand-secondary"
					transparent
				>
					<IconList />
					{expanded ? $i18n.stake.text.full_history : $i18n.stake.text.recent_history}
				</Button>
			{/if}
		{/snippet}
	</StakeContentSection>
{/if}

{#if $modalBtcTransaction && nonNullish(selectedBtcTransaction)}
	<BtcTransactionModal token={selectedBtcToken} transaction={selectedBtcTransaction} />
{:else if $modalEthTransaction && nonNullish(selectedEthTransaction)}
	<EthTransactionModal token={selectedEthToken} transaction={selectedEthTransaction} />
{:else if $modalIcTransaction && nonNullish(selectedIcTransaction)}
	<IcTransactionModal token={selectedIcToken} transaction={selectedIcTransaction} />
{:else if $modalSolTransaction && nonNullish(selectedSolTransaction)}
	<SolTransactionModal token={selectedSolToken} transaction={selectedSolTransaction} />
{/if}
