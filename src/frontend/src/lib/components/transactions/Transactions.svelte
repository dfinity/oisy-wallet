<script lang="ts">
	import type { Identity } from '@dfinity/agent';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import TransactionsSkeletons from './TransactionsSkeletons.svelte';
	import { goto } from '$app/navigation';
	import BtcTransactions from '$btc/components/transactions/BtcTransactions.svelte';
	import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import EthTransactions from '$eth/components/transactions/EthTransactions.svelte';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { loadUserTokens } from '$eth/services/erc20.services';
	import { icTokenErc20UserToken } from '$eth/utils/erc20.utils';
	import IcTransactions from '$icp/components/transactions/IcTransactions.svelte';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import { buildIcrcCustomTokens } from '$icp/services/icrc-custom-tokens.services';
	import { loadCustomTokens } from '$icp/services/icrc.services';
	import type { LedgerCanisterIdText } from '$icp/types/canister';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { icTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
	import { toCustomToken } from '$icp-eth/services/custom-token.services';
	import { toUserToken } from '$icp-eth/services/user-token.services';
	import { setManyCustomTokens, setManyUserTokens } from '$lib/api/backend.api';
	import Header from '$lib/components/ui/Header.svelte';
	import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
	import { networkBitcoin, networkICP } from '$lib/derived/network.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { authStore } from '$lib/stores/auth.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Token } from '$lib/types/token';
	import { parseTokenId } from '$lib/validation/token.validation';

	let icrcEnvTokens: IcrcCustomToken[] = [];
	let isLoading = false;
	let tokenAutoEnabled = false;

	onMount(() => {
		icrcEnvTokens = (buildIcrcCustomTokens()?.map((token) => ({
			...token,
			id: parseTokenId(token.symbol),
			enabled: false
		})) ?? []);
	});

	let knownLedgerCanisterIds: LedgerCanisterIdText[] = [];
	$: knownLedgerCanisterIds = $icrcTokens.map(({ ledgerCanisterId }) => ledgerCanisterId);

	let allIcrcTokens: IcrcCustomToken[] = [];
	$: allIcrcTokens = [
		...$icrcTokens,
		...icrcEnvTokens.filter(
			({ ledgerCanisterId }) => !knownLedgerCanisterIds.includes(ledgerCanisterId)
		)
	];

	const enableToken = async (token: Token, identity: Identity) => {
		if (icTokenErc20UserToken(token)) {
			await setManyUserTokens({
				identity,
				tokens: [toUserToken({ ...token, enabled: true })],
				nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
			});
			await loadUserTokens({ identity });
		} else if (icTokenIcrcCustomToken(token)) {
			await setManyCustomTokens({
				identity,
				tokens: [toCustomToken({ ...token, enabled: true })],
				nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
			});
			await loadCustomTokens({ identity });
		} else {
			throw new Error('Unknown token type. Token cannot be enabled.');
		}
	};

	const autoEnableToken = async () => {
		if (tokenAutoEnabled) {
			return;
		}
		tokenAutoEnabled = true;

		isLoading = true;

		try {
			const allTokens = [
				ICP_TOKEN,
				...$enabledBitcoinTokens,
				...$enabledEthereumTokens,
				...$erc20Tokens,
				...allIcrcTokens
			];

			const foundToken = allTokens.find((token) => (
					(token.symbol === $routeToken || token.name === $routeToken) &&
					token.network.id.description === $routeNetwork
				));

			if (nonNullish(foundToken)) {
				const { identity } = $authStore;
				if (nonNullish(identity)) {
					await enableToken(foundToken, identity);
				} else {
					throw new Error('No Identity available. Cannot enable token.');
				}
			} else {
				throw new Error('Token not found in user’s token list.');
			}
		} catch (error) {
			console.error('Error while auto-enabling token:', error);
			toastsError({
				msg: { text: $i18n.transactions.error.auto_enable_token }
			});
			goto('/');
		} finally {
			isLoading = false;
		}
	};

	/**
	 * Reactive condition:
	 * If we have a route network and route token but no $pageToken (meaning it's disabled),
	 * try to auto-enable it. Run only when not already loading or not previously attempted.
	 */
	$: if (
		isNullish($pageToken) &&
		nonNullish($routeNetwork) &&
		nonNullish($routeToken) &&
		!isLoading &&
		!tokenAutoEnabled
	) {
		autoEnableToken();
	}
</script>

{#if isLoading}
	<Header>
		{$i18n.transactions.text.title}
	</Header>
	<TransactionsSkeletons loading={isLoading} />
{:else if nonNullish($routeNetwork)}
	{#if $networkICP}
		<IcTransactions />
	{:else if $networkBitcoin}
		<BtcTransactions />
	{:else if nonNullish($routeToken)}
		<EthTransactions />
	{/if}
{/if}
