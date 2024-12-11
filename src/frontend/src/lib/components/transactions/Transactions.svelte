<script lang="ts">
	import type { Identity } from '@dfinity/agent';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import TransactionsSkeletons from './TransactionsSkeletons.svelte';
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
	import { parseTokenId } from '$lib/validation/token.validation';
	import type { Token } from '$lib/types/token';

	let icrcEnvTokens: IcrcCustomToken[] = [];
	let isLoading = false;
	let attemptedAutoEnableToken = false;

	onMount(() => {
		const tokens = buildIcrcCustomTokens();
		icrcEnvTokens =
			tokens?.map((token) => ({
				...token,
				id: parseTokenId(token.symbol),
				enabled: false
			})) ?? [];
	});

	let tokensLoaded = false;
	$: tokensLoaded = [
		$erc20Tokens,
		$icrcTokens,
		icrcEnvTokens,
		$enabledBitcoinTokens,
		$enabledEthereumTokens
	].every((tokens) => tokens.length > 0);

	let shouldEnableToken = false;
	$: shouldEnableToken =
		isNullish($pageToken) && nonNullish($routeToken) && nonNullish($routeNetwork);

	const enableToken = async (token: Token, identity: Identity) => {
		try {
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
		} catch (error) {
			console.error('Error enabling token:', error);
			throw error;
		}
	};

	const findAndEnableToken = async () => {
		if (!shouldEnableToken) return;

		const allTokens = [
			ICP_TOKEN,
			...$enabledBitcoinTokens,
			...$enabledEthereumTokens,
			...$erc20Tokens,
			...allIcrcTokens
		];

		const foundToken = allTokens.find(
			(token) =>
				(token.symbol === $routeToken || token.name === $routeToken) &&
				token.network.id.description === $routeNetwork
		);

		if (nonNullish(foundToken)) {
			const { identity } = $authStore;
			if (nonNullish(identity)) {
				await enableToken(foundToken, identity);
			}
		}
	};

	const autoEnableToken = async () => {
		if (attemptedAutoEnableToken || !tokensLoaded) return;

		try {
			isLoading = true;

			if (shouldEnableToken) {
				await findAndEnableToken();
			}
		} catch (error) {
			console.error('Initialization error:', error);
			toastsError({
				msg: { text: $i18n.transactions.error.auto_enable_token }
			});
		} finally {
			isLoading = false;
			attemptedAutoEnableToken = true;
		}
	};

	let knownLedgerCanisterIds: LedgerCanisterIdText[] = [];
	$: knownLedgerCanisterIds = $icrcTokens.map(({ ledgerCanisterId }) => ledgerCanisterId);

	let allIcrcTokens: IcrcCustomToken[] = [];
	$: allIcrcTokens = [
		...$icrcTokens,
		...icrcEnvTokens.filter(
			({ ledgerCanisterId }) => !knownLedgerCanisterIds.includes(ledgerCanisterId)
		)
	];

	$: if (tokensLoaded && !attemptedAutoEnableToken) {
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
