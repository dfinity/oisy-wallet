<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks.env';
	import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens.env';
	import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { mapTransactionUi } from '$eth/utils/transactions.utils';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TransactionUi } from '$lib/types/transaction';
	import {
		isNetworkIdBTCMainnet,
		isNetworkIdEthereumMainnet,
		isNetworkIdICP,
		isNetworkIdSepolia
	} from '$lib/utils/network.utils';

	let transactions: TransactionUi[];
	$: transactions = $enabledTokens.reduce<TransactionUi[]>(
		(acc, { id: tokenId, network: { id: networkId } }) => {
			if (isNetworkIdICP(networkId)) {
				// TODO: Implement ICP transactions
				return acc;
			}

			if (isNetworkIdEthereumMainnet(networkId)) {
				return [
					...acc,
					...($ethTransactionsStore[tokenId] ?? []).map((transaction) => ({
						...mapTransactionUi({
							transaction,
							ckMinterInfoAddresses: toCkMinterInfoAddresses({
								minterInfo: $ckEthMinterInfoStore?.[ETHEREUM_TOKEN_ID],
								networkId: ETHEREUM_NETWORK_ID
							}),
							$ethAddress: $ethAddress
						}),
						id: transaction.hash ?? '',
						transactionComponent: EthTransaction
					}))
				];
			}

			// TODO: Remove this commented text when the feature is complete. For now it is useful to have it here as for local dev testing.
			if (isNetworkIdSepolia(networkId)) {
				return [
					...acc,
					...($ethTransactionsStore[tokenId] ?? []).map((transaction) => ({
						...mapEthTransactionUi({
							transaction,
							ckMinterInfoAddresses: toCkMinterInfoAddresses({
								minterInfo: $ckEthMinterInfoStore?.[SEPOLIA_TOKEN_ID],
								networkId: SEPOLIA_NETWORK_ID
							}),
							$ethAddress: $ethAddress
						}),
						id: transaction.hash ?? '',
						transactionComponent: EthTransaction
					}))
				];
			}

			if (isNetworkIdBTCMainnet(networkId) && nonNullish($btcTransactionsStore)) {
				return [
					...acc,
					...($btcTransactionsStore[tokenId] ?? []).map(({ data: transaction }) => ({
						...transaction,
						transactionComponent: BtcTransaction
					}))
				];
			}

			return acc;
		},
		[]
	);
</script>

<PageTitle>{$i18n.activity.text.title}</PageTitle>

{#if transactions.length > 0}
	{#each transactions as transaction, index (`${transaction.id}-${index}`)}
		<li in:slide={SLIDE_DURATION}>
			<svelte:component this={transaction.transactionComponent} {transaction} />
		</li>
	{/each}
{/if}

{#if transactions.length === 0}
	<TransactionsPlaceholder />
{/if}
