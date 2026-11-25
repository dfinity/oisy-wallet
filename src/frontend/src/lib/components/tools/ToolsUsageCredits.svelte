<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { CYCLES_MINT_ENABLED } from '$env/cycles-mint.env';
	import CyclesMintModal from '$icp/components/cycles-mint/CyclesMintModal.svelte';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import { isTokenCyclesLedger } from '$icp/utils/cycles-mint.utils';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import ToolsUsageCreditsModal from '$lib/components/tools/ToolsUsageCreditsModal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import {
		TOOLS_USAGE_CREDITS_ADD_MORE_BUTTON,
		TOOLS_USAGE_CREDITS_BALANCE,
		TOOLS_USAGE_CREDITS_GET_CYCLES_BUTTON,
		TOOLS_USAGE_CREDITS_OWN_CREDITS
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { modalCyclesMint, modalUsageCreditsAdd } from '$lib/derived/modal.derived';
	import { loadOwnCycles, type OwnCycles } from '$lib/services/own-cycles.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	// Enabled or not: the card reads the cycles ledger itself, so it works with TCYCLES inactive.
	let token = $derived($icrcTokens.find(isTokenCyclesLedger));

	let exchangeRate = $derived(nonNullish(token) ? $exchanges?.[token.id]?.usd : undefined);

	let ownCycles = $state<OwnCycles | undefined>();
	let loadFailed = $state(false);

	const load = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		try {
			ownCycles = await loadOwnCycles({ identity: $authIdentity });
			loadFailed = false;
		} catch (err: unknown) {
			loadFailed = true;

			toastsError({ msg: { text: $i18n.usage_credits.error.load }, err });
		}
	};

	const addModalId = Symbol();
	const mintModalId = Symbol();

	let addModalOpen = $derived($modalUsageCreditsAdd && $modalStore?.id === addModalId);
	let mintModalOpen = $derived($modalCyclesMint && $modalStore?.id === mintModalId);

	// Read when the card shows, and again each time one of its modals closes: adding credits
	// changes the approval, and minting the balance.
	$effect(() => {
		if (!addModalOpen && !mintModalOpen) {
			load();
		}
	});
</script>

{#snippet amount(value: bigint | undefined, testId: string)}
	{#if nonNullish(value) && nonNullish(token)}
		<!-- The fiat value as the send shows it, from the amount in full. -->
		<span class="flex gap-2 text-sm text-tertiary">
			<output data-tid={testId}
				>{formatToken({ value, unitName: token.decimals })} {token.symbol}</output
			>
			<ConvertAmountExchange
				amount={formatToken({ value, unitName: token.decimals, displayDecimals: token.decimals })}
				{exchangeRate}
			/>
		</span>
	{:else if loadFailed}
		<span class="text-sm text-tertiary" data-tid={testId}>{$i18n.core.text.not_available}</span>
	{:else}
		<span class="mt-1 w-20"><SkeletonText /></span>
	{/if}
{/snippet}

{#if nonNullish(token)}
	<SettingsCard>
		{#snippet title()}{$i18n.usage_credits.text.title}{/snippet}

		<!-- Shown, not behind a help toggle, as every card on Tools shows its text. Pulled up to the
		     title it explains: the card's title gap is sized for rows. -->
		<p class="-mt-4 mb-3 text-sm text-tertiary">
			{replacePlaceholders($i18n.usage_credits.text.description, { $token: token.symbol })}
		</p>

		<SettingsCardItem>
			{#snippet key()}
				<span class="flex flex-col">
					{$i18n.usage_credits.text.own_credits}
					{@render amount(ownCycles?.approved, TOOLS_USAGE_CREDITS_OWN_CREDITS)}
				</span>
			{/snippet}

			{#snippet value()}
				<Button
					disabled={isNullish(ownCycles)}
					link
					onclick={() => modalStore.openUsageCreditsAdd(addModalId)}
					testId={TOOLS_USAGE_CREDITS_ADD_MORE_BUTTON}>{$i18n.usage_credits.text.add_more} ></Button
				>
			{/snippet}
		</SettingsCardItem>

		<SettingsCardItem>
			{#snippet key()}
				<span class="flex flex-col">
					{replacePlaceholders($i18n.usage_credits.text.balance, { $token: token.symbol })}
					{@render amount(ownCycles?.balance, TOOLS_USAGE_CREDITS_BALANCE)}
				</span>
			{/snippet}

			{#snippet value()}
				{#if CYCLES_MINT_ENABLED}
					<Button
						link
						onclick={() => modalStore.openCyclesMint(mintModalId)}
						testId={TOOLS_USAGE_CREDITS_GET_CYCLES_BUTTON}
						>{$i18n.usage_credits.text.get_cycles} ></Button
					>
				{/if}
			{/snippet}
		</SettingsCardItem>
	</SettingsCard>

	{#if addModalOpen && nonNullish(ownCycles)}
		<ToolsUsageCreditsModal onError={load} {ownCycles} {token} />
	{:else if mintModalOpen}
		<CyclesMintModal destinationToken={token} />
	{/if}
{/if}
