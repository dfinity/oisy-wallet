<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import PlugImportAccount from '$lib/components/plug-import/PlugImportAccount.svelte';
	import PlugImportForm from '$lib/components/plug-import/PlugImportForm.svelte';
	import { PLUG_IMPORT_ERROR, PLUG_IMPORT_NOTICES } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledIcTokens, nativeTokens } from '$lib/derived/tokens.derived';
	import { loadPlugBalances } from '$lib/services/plug.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type { PlugAccount, PlugBalance } from '$lib/types/plug';
	import { derivePlugAccounts } from '$lib/utils/plug.utils';

	// The phrase lives here and nowhere else: no store, no storage, no URL. Leaving
	// the page or reloading it discards it, which is the intended lifecycle.
	let phrase = $state('');
	let depth = $state(1);
	let loading = $state(false);
	let error = $state<string | undefined>(undefined);
	let accounts = $state<PlugAccount[]>([]);
	const balances = new SvelteMap<number, PlugBalance[]>();

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

		const results = await Promise.all(
			accounts.map(async (account) => ({
				index: account.index,
				loaded: await loadPlugBalances({
					account,
					icTokens: $enabledIcTokens,
					nativeTokens: $nativeTokens,
					identity: $authIdentity
				})
			}))
		);

		results.forEach(({ index, loaded }) => balances.set(index, loaded));

		if (results.some(({ loaded }) => loaded.some(({ balance }) => balance === undefined))) {
			error = $i18n.plug_import.error.balances_failed;
		}
	};
</script>

<p class="mb-6 text-tertiary">{$i18n.plug_import.text.intro}</p>

<PlugImportForm {loading} onreset={reset} onsubmit={submit} bind:phrase bind:depth />

{#if accounts.length > 0}
	<div class="mt-8 flex w-full flex-col">
		{#each accounts as account (account.index)}
			<PlugImportAccount {account} balances={balances.get(account.index)} />
		{/each}
	</div>

	<div class="mt-2 rounded-lg bg-brand-subtle-10 p-4" data-tid={PLUG_IMPORT_NOTICES}>
		<span class="font-bold">{$i18n.plug_import.text.not_shown_title}</span>
		<p class="mt-1 text-sm text-tertiary">{$i18n.plug_import.text.not_shown_description}</p>

		<span class="mt-3 flex font-bold">{$i18n.plug_import.text.read_only_title}</span>
		<p class="mt-1 text-sm text-tertiary">{$i18n.plug_import.text.read_only_description}</p>
	</div>
{/if}

{#if error !== undefined}
	<p class="mt-4 text-error-primary" data-tid={PLUG_IMPORT_ERROR}>{error}</p>
{/if}
