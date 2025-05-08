<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import { loadNextIcTransactions } from '$icp/services/ic-transactions.services';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import type { Token, TokenId } from '$lib/types/token';
	import type { AllTransactionUiWithCmp } from '$lib/types/transaction';
	import { isNetworkIdICP, isNetworkIdSolana } from '$lib/utils/network.utils';
	import { loadNextSolTransactions } from '$sol/services/sol-transactions.services.js';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';

	interface Props {
		transactions: AllTransactionUiWithCmp[];
		children?: Snippet;
	}

	let { transactions, children }: Props = $props();

	let disableLoader: Record<TokenId, boolean> = $state({});

	const loadMissingTransactions = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (transactions.length === 0) {
			return;
		}

		const minTimestamp = Math.min(
			...transactions.map(({ transaction: { timestamp } }) => Number(timestamp))
		);

		const findLastTransaction = <T extends IcTransactionUi | SolTransactionUi>(
			transactions: T[]
		): T | undefined =>
			transactions.length >= 0
				? transactions.reduce<T>(
						(min, transaction) =>
							(transaction.timestamp ?? Infinity) < (min.timestamp ?? Infinity) ? transaction : min,
						transactions[0]
					)
				: undefined;

		const loadNextTransactions = async (token: Token) => {
			const {
				id: tokenId,
				network: { id: networkId }
			} = token;

			if (disableLoader[tokenId]) {
				return;
			}

			// To be type-safe we need to check for valid interfaces too
			if (isNetworkIdICP(networkId)) {
				const icTransactions = ($icTransactionsStore?.[tokenId] ?? []).map(({ data }) => data);

				if (icTransactions.length === 0) {
					return;
				}

				const lastIcTransaction = findLastTransaction(icTransactions);

				const { timestamp: minIcTimestamp, id: lastIcId } = lastIcTransaction ?? {};

				if (nonNullish(minIcTimestamp) && Number(minIcTimestamp) <= minTimestamp) {
					return;
				}

				await loadNextIcTransactions({
					lastId: lastIcId,
					owner: $authIdentity.getPrincipal(),
					identity: $authIdentity,
					maxResults: WALLET_PAGINATION,
					token,
					signalEnd: () => (disableLoader[tokenId] = true)
				});

				// We call the function again in case the last transaction is not the last one that we need
				await loadNextTransactions(token);
			} else if (isNetworkIdSolana(networkId)) {
				const solTransactions = ($solTransactionsStore?.[tokenId] ?? []).map(({ data }) => data);

				const lastSolTransaction = findLastTransaction(solTransactions);

				const { timestamp: minSolTimestamp, signature: lastSolSignature } =
					lastSolTransaction ?? {};

				if (nonNullish(minSolTimestamp) && Number(minSolTimestamp) <= minTimestamp) {
					return;
				}

				await loadNextSolTransactions({
					token,
					before: lastSolSignature,
					signalEnd: () => (disableLoader[tokenId] = true)
				});

				// We call the function again in case the last transaction is not the last one that we need
				await loadNextTransactions(token);
			}
		};

		await Promise.allSettled($enabledNetworkTokens.map(loadNextTransactions));
	};

	onMount(loadMissingTransactions);
</script>

{@render children?.()}
