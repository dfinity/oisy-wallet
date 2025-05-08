<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import { loadNextIcTransactions } from '$icp/services/ic-transactions.services';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcTransactionUi } from '$icp/types/ic-transaction';
	import { isIcToken, isIcTokenCanistersStrict } from '$icp/validation/ic-token.validation';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet,
		solAddressTestnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import type { Token, TokenId } from '$lib/types/token';
	import type { AllTransactionUiWithCmp } from '$lib/types/transaction';
	import {
		isNetworkIdICP,
		isNetworkIdSolana,
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import { loadNextSolTransactions } from '$sol/services/sol-transactions.services.js';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
	import type { SolTransactionUi } from '$sol/types/sol-transaction';
	import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
	import { isTokenSpl } from '$sol/utils/spl.utils';

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

		const findLastTransaction = <T extends IcTransactionUi | SolTransactionUi>(transactions: T[]) =>
			transactions.reduce<T>(
				(min, transaction) =>
					(transaction.timestamp ?? Infinity) < (min.timestamp ?? Infinity) ? transaction : min,
				transactions[0]
			);

		const loadNextTransactions = async (token: Token) => {
			const {
				id: tokenId,
				network: { id: networkId }
			} = token;

			if (disableLoader[tokenId]) {
				return;
			}

			// To be type-safe we need to check for valid interfaces too
			if (isNetworkIdICP(networkId) && isIcToken(token) && isIcTokenCanistersStrict(token)) {
				const icTransactions = ($icTransactionsStore?.[tokenId] ?? []).map(({ data }) => data);

				if (icTransactions.length === 0) {
					return;
				}

				const lastIcTransaction = findLastTransaction(icTransactions);

				const { timestamp: minIcTimestamp, id: lastIcId } = lastIcTransaction;

				if (Number(minIcTimestamp) <= minTimestamp) {
					return;
				}

				if (isNullish(lastIcId)) {
					// No transactions, we do nothing here and wait for the worker to post the first transactions
					return;
				}

				await loadNextIcTransactions({
					owner: $authIdentity.getPrincipal(),
					identity: $authIdentity,
					maxResults: WALLET_PAGINATION,
					start: BigInt(lastIcId.replace('-self', '')),
					token,
					signalEnd: () => (disableLoader[tokenId] = true)
				});

				// We call the function again in case the last transaction is not the last one that we need
				await loadNextTransactions(token);
			} else if (isNetworkIdSolana(networkId)) {
				const solTransactions = ($solTransactionsStore?.[tokenId] ?? []).map(({ data }) => data);

				if (solTransactions.length === 0) {
					return;
				}

				const lastSolTransaction = findLastTransaction(solTransactions);

				const { timestamp: minSolTimestamp, signature: lastSolSignature } = lastSolTransaction;

				if (Number(minSolTimestamp) <= minTimestamp) {
					return;
				}

				const network = mapNetworkIdToNetwork(networkId);

				const address = isNetworkIdSOLTestnet(networkId)
					? $solAddressTestnet
					: isNetworkIdSOLDevnet(networkId)
						? $solAddressDevnet
						: isNetworkIdSOLLocal(networkId)
							? $solAddressLocal
							: $solAddressMainnet;

				if (isNullish(network) || isNullish(address)) {
					return;
				}

				const { address: tokenAddress, owner: tokenOwnerAddress } = isTokenSpl(token)
					? token
					: { address: undefined, owner: undefined };

				await loadNextSolTransactions({
					network,
					address,
					tokenAddress,
					tokenOwnerAddress,
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
