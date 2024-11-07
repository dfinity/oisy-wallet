<script lang="ts">
	import { debounce, nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks.env';
	import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens.env';
	import { loadTransactions } from '$eth/services/transactions.services';
	import { transactionsStore } from '$eth/stores/transactions.store';
	import { mapTransactionUi } from '$eth/utils/transactions.utils';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import type { Token } from '$lib/types/token';
	import {
		isNetworkIdBTCMainnet,
		isNetworkIdEthereum,
		isNetworkIdEthereumMainnet,
		isNetworkIdICP,
		isNetworkIdSepolia
	} from '$lib/utils/network.utils';
	import type { TransactionUi } from '$lib/types/transaction';
	import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	const load = async (token: Token) => {
		const {
			network: { id: networkId },
			id: tokenId
		} = token;

		if (!isNetworkIdEthereum(networkId)) {
			return;
		}

		console.log('Loading transactions for token:', token);

		await loadTransactions({ tokenId, networkId });
	};

	const multiLoad = async () => {
		await Promise.all($enabledTokens.map(async (token) => await load(token)));
	};

	// We debounce because we have a limit of calls per second to the API and the Ethereum tokens list is not u
	const debounceMultiLoad = debounce(multiLoad, 500);

	$: $enabledTokens, debounceMultiLoad();

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
					...($transactionsStore[tokenId] ?? []).map((transaction) => ({
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
					...($transactionsStore[tokenId] ?? []).map((transaction) => ({
						...mapTransactionUi({
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
