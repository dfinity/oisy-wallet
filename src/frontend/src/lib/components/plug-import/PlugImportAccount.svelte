<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { PLUG_IMPORT_ACCOUNT } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { PlugBalance, PlugAccount } from '$lib/types/plug';
	import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		account: PlugAccount;
		balances: PlugBalance[] | undefined;
	}

	let { account, balances }: Props = $props();

	let loaded = $derived(nonNullish(balances));

	// A zero balance is noise on a migration screen — the user is looking for what is
	// there to move. Rows whose lookup failed are kept, because "unavailable" and
	// "empty" must not look the same.
	let visible = $derived(
		(balances ?? []).filter(({ balance }) => isNullish(balance) || balance > ZERO)
	);
</script>

<div
	class="mb-4 flex w-full flex-col gap-3 rounded-lg bg-primary p-4"
	data-tid={PLUG_IMPORT_ACCOUNT}
>
	<span class="font-bold"
		>{replacePlaceholders($i18n.plug_import.text.account, {
			$index: `${account.index + 1}`
		})}</span
	>

	<div class="flex flex-row items-center gap-2">
		<span class="text-tertiary">{$i18n.plug_import.text.principal}</span>
		<span>{shortenWithMiddleEllipsis({ text: account.principal })}</span>
		<Copy inline text={$i18n.plug_import.text.principal} value={account.principal} />
	</div>

	{#if !loaded}
		<span class="text-tertiary">{$i18n.plug_import.text.balance_loading}</span>
	{:else if visible.length === 0}
		<span class="text-tertiary">{$i18n.plug_import.text.empty_account}</span>
	{:else}
		<ul class="flex w-full flex-col gap-2">
			{#each visible as { token, address, balance } (`${token.symbol}-${address}`)}
				<li class="flex w-full flex-row items-center justify-between gap-3">
					<span class="flex flex-col">
						<span class="font-bold">{token.symbol}</span>
						<span class="text-sm text-tertiary">{token.network.name}</span>
					</span>

					<span class="flex flex-col items-end">
						<span>
							{#if nonNullish(balance)}
								{formatToken({ value: balance, unitName: token.decimals })}
							{:else}
								{$i18n.plug_import.text.balance_unavailable}
							{/if}
						</span>
						<span class="text-sm text-tertiary">{shortenWithMiddleEllipsis({ text: address })}</span
						>
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
