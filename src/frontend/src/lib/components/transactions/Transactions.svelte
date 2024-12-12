<script lang="ts">
	import type { Identity } from '@dfinity/agent';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import TransactionsSkeletons from './TransactionsSkeletons.svelte';
	import BtcTransactions from '$btc/components/transactions/BtcTransactions.svelte';
	import EthTransactions from '$eth/components/transactions/EthTransactions.svelte';
	import { loadUserTokens } from '$eth/services/erc20.services';
	import { icTokenErc20UserToken } from '$eth/utils/erc20.utils';
	import IcTransactions from '$icp/components/transactions/IcTransactions.svelte';
	import { loadCustomTokens } from '$icp/services/icrc.services';
	import { icTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
	import { setCustomToken } from '$icp-eth/services/custom-token.services';
	import { setUserToken } from '$icp-eth/services/user-token.services';
	import Header from '$lib/components/ui/Header.svelte';
	import { allTokens } from '$lib/derived/all-tokens.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
	import { networkBitcoin, networkICP } from '$lib/derived/network.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionToken, Token } from '$lib/types/token';

	let autoEnabledToken = false;
	let isLoading = false;
	let token: OptionToken;
	$: token = $allTokens.find((token) => token.name === $routeToken);

	const isValidVersion = (token: { version?: bigint }): boolean =>
		nonNullish(token.version) && token.version >= 0n;

	const tryEnableToken = async (token: Token) => {
		if (autoEnabledToken) {
			return;
		}

		isLoading = true;

		try {
			const identity = $authIdentity;
			if (!identity) {
				throw new Error('No identity found');
			}

			if (icTokenErc20UserToken(token) || icTokenIcrcCustomToken(token)) {
				if (!isValidVersion(token)) {
					return;
				}

				await enableToken({ token, identity });
			} else {
				console.error(`Unknown token type: ${token.name}`);
				throw new Error(`Unknown token type ${token.name}`);
			}
		} catch (error) {
			console.error('Error enabling token:', error);
			toastsError({ msg: { text: $i18n.transactions.error.auto_enable_token } });
		} finally {
			isLoading = false;
		}
	};

	const enableToken = async ({ token, identity }: { token: Token; identity: Identity }) => {
		if (icTokenErc20UserToken(token)) {
			autoEnabledToken = true;
			await setUserToken({ identity, token, enabled: true });
			await loadUserTokens({ identity });
		} else if (icTokenIcrcCustomToken(token)) {
			autoEnabledToken = true;
			await setCustomToken({ identity, token, enabled: true });
			await loadCustomTokens({ identity });
		}
	};

	$: if (
		isNullish($pageToken) &&
		nonNullish($routeToken) &&
		nonNullish(token) &&
		!autoEnabledToken
	) {
		tryEnableToken(token);
	}
</script>

{#if isLoading}
	<Header>{$i18n.transactions.text.title}</Header>
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
