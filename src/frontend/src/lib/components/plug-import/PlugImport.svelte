<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Principal } from '@icp-sdk/core/principal';
	import { SvelteMap } from 'svelte/reactivity';
	import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
	import PlugImportAccount from '$lib/components/plug-import/PlugImportAccount.svelte';
	import PlugImportForm from '$lib/components/plug-import/PlugImportForm.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { PLUG_IMPORT_ERROR, PLUG_IMPORT_NOTICES } from '$lib/constants/test-ids.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledFungibleTokens } from '$lib/derived/tokens.derived';
	import { sweepPlugEvmBalance } from '$lib/services/plug-evm.services';
	import { loadPlugBalances, sweepPlugBalance } from '$lib/services/plug.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import type { NetworkId } from '$lib/types/network';
	import type { PlugAccount, PlugBalance } from '$lib/types/plug';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNetworkIdEthereum, isNetworkIdEvm } from '$lib/utils/network.utils';
	import {
		derivePlugAccounts,
		derivePlugIdentity,
		isPlugEvmContractToken,
		isPlugSweepableToken,
		plugEvmNetwork,
		plugRowKey
	} from '$lib/utils/plug.utils';

	// The phrase lives here and nowhere else: no store, no storage, no URL. Leaving
	// the page or reloading it discards it, which is the intended lifecycle.
	let phrase = $state('');
	let depth = $state(1);
	let loading = $state(false);
	let error = $state<string | undefined>(undefined);
	let accounts = $state<PlugAccount[]>([]);
	// Symbol of the row currently being sent, so only that row shows a spinner and no
	// second send can start while a transfer is in flight.
	let sending = $state<string | undefined>(undefined);
	const balances = new SvelteMap<number, PlugBalance[]>();

	const loadBalancesFor = async (account: PlugAccount): Promise<void> => {
		const loaded = await loadPlugBalances({
			account,
			tokens: $enabledFungibleTokens,
			identity: $authIdentity
		});

		balances.set(account.index, loaded);
	};

	// Which chain's send path a row takes. The imported identity is derived per call
	// and never stored, so it lives only for the duration of one transfer.
	const sendFor = async ({
		account,
		row: { token, address },
		amount,
		destination
	}: {
		account: PlugAccount;
		row: PlugBalance;
		amount: bigint;
		destination: Principal;
	}): Promise<void> => {
		const identity = derivePlugIdentity({ phrase, index: account.index });
		const { network } = token;

		if (isNetworkIdEthereum(network.id) || isNetworkIdEvm(network.id)) {
			const evmNetwork = plugEvmNetwork(network.id);

			if (isNullish(evmNetwork)) {
				throw new Error(`No EVM network configured for ${network.name}`);
			}

			// The EVM destination is the user's own OISY EVM address, not their principal.
			if (isNullish($ethAddress)) {
				throw new Error('Your OISY Ethereum address is not loaded yet');
			}

			await sweepPlugEvmBalance({
				identity,
				token,
				balance: amount,
				nativeBalance: nativeBalanceFor({ account, networkId: network.id }),
				destination: mapAddressStartsWith0x($ethAddress),
				from: address,
				network: evmNetwork
			});

			return;
		}

		if (!isPlugSweepableToken(token)) {
			throw new Error(`No send path for ${token.symbol} on ${network.name}`);
		}

		await sweepPlugBalance({ identity, token, amount, destination });
	};

	const nativeBalanceFor = ({
		account,
		networkId
	}: {
		account: PlugAccount;
		networkId: NetworkId;
	}): bigint =>
		(balances.get(account.index) ?? []).find(
			({ token }) => token.network.id === networkId && !isPlugEvmContractToken(token)
		)?.balance ?? ZERO;

	const send = async ({
		account,
		balance: row,
		amount
	}: {
		account: PlugAccount;
		balance: PlugBalance;
		amount: bigint;
	}): Promise<void> => {
		const { token } = row;
		const destination = $authIdentity?.getPrincipal();

		// Guaranteed by the UI, which only offers an action on a movable row behind
		// auth — but a transfer must not be attempted on a half-known state.
		if (isNullish(destination)) {
			return;
		}

		sending = plugRowKey(row);

		try {
			await sendFor({ account, row, amount, destination });

			toastsShow({
				text: replacePlaceholders($i18n.plug_import.text.send_success, { $symbol: token.symbol }),
				level: 'success',
				duration: 3000
			});

			await loadBalancesFor(account);
		} catch (err: unknown) {
			toastsError({
				msg: {
					text: replacePlaceholders($i18n.plug_import.error.send_failed, { $symbol: token.symbol })
				},
				err
			});
		} finally {
			sending = undefined;
		}
	};

	const reset = () => {
		phrase = '';
		depth = 1;
		error = undefined;
		accounts = [];
		balances.clear();
	};

	const submit = async () => {
		loading = true;
		error = undefined;
		accounts = [];
		balances.clear();

		try {
			accounts = derivePlugAccounts({ phrase, depth });
		} catch (_err: unknown) {
			// The phrase itself must never reach a log or an error message.
			error = $i18n.plug_import.error.derivation_failed;
			loading = false;
			return;
		}

		loading = false;

		// Loaded per account rather than in one batch, so each account's rows appear as
		// soon as they resolve instead of waiting on the slowest provider overall.
		await Promise.all(accounts.map(loadBalancesFor));
	};
</script>

<p class="mb-6 text-tertiary">{$i18n.plug_import.text.intro}</p>

<PlugImportForm {loading} onreset={reset} onsubmit={submit} bind:phrase bind:depth />

{#if accounts.length > 0}
	<div class="mt-8 flex w-full flex-col">
		{#each accounts as account (account.index)}
			<PlugImportAccount
				{account}
				balances={balances.get(account.index)}
				onsend={({ balance, amount }) => void send({ account, balance, amount })}
				{sending}
			/>
		{/each}
	</div>

	<div class="mt-2 rounded-lg bg-brand-subtle-10 p-4" data-tid={PLUG_IMPORT_NOTICES}>
		<p class="text-sm text-tertiary">{$i18n.plug_import.text.unavailable_hint}</p>

		<span class="mt-3 flex font-bold">{$i18n.plug_import.text.not_shown_title}</span>
		<p class="mt-1 text-sm text-tertiary">{$i18n.plug_import.text.not_shown_description}</p>

		<span class="mt-3 flex font-bold">{$i18n.plug_import.text.read_only_title}</span>
		<p class="mt-1 text-sm text-tertiary">{$i18n.plug_import.text.read_only_description}</p>
	</div>
{/if}

{#if error !== undefined}
	<p class="mt-4 text-error-primary" data-tid={PLUG_IMPORT_ERROR}>{error}</p>
{/if}
