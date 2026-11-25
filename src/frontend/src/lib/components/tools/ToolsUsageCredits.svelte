<script lang="ts">
	import { isNullish, nonNullish, queryAndUpdate } from '@dfinity/utils';
	import { CYCLES_MINT_ENABLED } from '$env/cycles-mint.env';
	import CyclesMintModal from '$icp/components/cycles-mint/CyclesMintModal.svelte';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import { isTokenCyclesLedger } from '$icp/utils/cycles-mint.utils';
	import { SIGNER_CALL_ESTIMATED_CYCLES } from '$lib/canisters/signer.constants';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import ToolsUsageCreditsModal from '$lib/components/tools/ToolsUsageCreditsModal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { OISY_USAGE_CREDITS_DOCS_URL } from '$lib/constants/oisy.constants';
	import {
		TOOLS_USAGE_CREDITS_ADD_MORE_BUTTON,
		TOOLS_USAGE_CREDITS_BALANCE,
		TOOLS_USAGE_CREDITS_BALANCE_SHORT,
		TOOLS_USAGE_CREDITS_FREE_SIGNATURES,
		TOOLS_USAGE_CREDITS_GET_CYCLES_BUTTON,
		TOOLS_USAGE_CREDITS_OWN_CREDITS
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { modalCyclesMint, modalUsageCreditsAdd } from '$lib/derived/modal.derived';
	import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
	import { buildLearnMoreEvent } from '$lib/services/analytics.services';
	import {
		loadFreeAllowance,
		loadOwnCycles,
		loadPreviousSpendingLimit,
		type OwnCycles
	} from '$lib/services/own-cycles.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	// Enabled or not: the card reads the cycles ledger itself, so it works with TCYCLES inactive.
	let token = $derived($icrcTokens.find(isTokenCyclesLedger));

	let exchangeRate = $derived(nonNullish(token) ? $exchanges?.[token.id]?.usd : undefined);

	// Its text, not the token: the card reads again when it changes, not with each new token list.
	let indexCanisterId = $derived(token?.indexCanisterId);

	let ownCycles = $state<OwnCycles | undefined>();
	// What is left of the free OISY allowance.
	let free = $state<bigint | undefined>();
	let loadFailed = $state(false);

	// The limit the user set last, as the index lists it.
	let indexedLimit = $state<bigint | undefined>();

	let previousLimit = $derived.by(() => {
		if (isNullish(ownCycles)) {
			return undefined;
		}

		// A limit below what is left of it can't be the one in force: then only what is left shows.
		return nonNullish(indexedLimit) && indexedLimit >= ownCycles.approved
			? indexedLimit
			: undefined;
	});

	// What signing can charge: what is left of the limit, as far as the balance covers it.
	let chargeable = $derived(
		nonNullish(ownCycles)
			? ownCycles.approved < ownCycles.balance
				? ownCycles.approved
				: ownCycles.balance
			: undefined
	);

	// An estimate, from the cost the backend sizes the OISY allowance with.
	const signatures = (cycles: bigint): bigint => cycles / SIGNER_CALL_ESTIMATED_CYCLES;

	const signaturesText = (cycles: bigint): string => {
		const count = signatures(cycles);

		return count === 1n
			? $i18n.usage_credits.text.signatures_one
			: replacePlaceholders($i18n.usage_credits.text.signatures_other, { $count: `${count}` });
	};

	const load = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		// The query answers fast, and the certified answer follows and replaces it: a replica that has
		// not caught up with an approval just made can't leave the card behind.
		await queryAndUpdate<[OwnCycles, bigint, bigint | undefined]>({
			request: ({ identity, certified }) =>
				Promise.all([
					loadOwnCycles({ identity, certified }),
					loadFreeAllowance({ identity, certified }),
					// Without it the card shows what is left, as it does with no limit found.
					nonNullish(indexCanisterId)
						? loadPreviousSpendingLimit({ identity, indexCanisterId, certified }).catch(
								() => undefined
							)
						: undefined
				]),
			onLoad: ({ response: [own, freeLeft, indexed] }) => {
				ownCycles = own;
				free = freeLeft;
				indexedLimit = indexed;
				loadFailed = false;
			},
			onUpdateError: ({ error: err }) => {
				loadFailed = true;

				toastsError({ msg: { text: $i18n.usage_credits.error.load }, err });
			},
			identity: $authIdentity
		});
	};

	const addModalId = Symbol();
	const mintModalId = Symbol();

	let addModalOpen = $derived($modalUsageCreditsAdd && $modalStore?.id === addModalId);
	let mintModalOpen = $derived($modalCyclesMint && $modalStore?.id === mintModalId);

	// Read when the card shows, and again each time one of its modals closes: setting the limit
	// changes the approval, and minting the balance.
	$effect(() => {
		if (!addModalOpen && !mintModalOpen) {
			load();
		}
	});
</script>

{#snippet amount(
	value: bigint | undefined,
	testId: string,
	{ limit, estimate }: { limit?: bigint; estimate?: bigint } = {}
)}
	{#if nonNullish(value) && nonNullish(token)}
		{@const shown = formatToken({ value, unitName: token.decimals })}
		<!-- The fiat value as the send shows it, from the amount in full: what is left, not the limit. -->
		<span class="flex gap-2 text-sm text-tertiary">
			<output data-tid={testId}
				>{nonNullish(limit) && limit > ZERO
					? replacePlaceholders($i18n.usage_credits.text.limit_left, {
							$remaining: shown,
							$limit: formatToken({ value: limit, unitName: token.decimals }),
							$token: token.symbol
						})
					: `${shown} ${token.symbol}`}</output
			>
			<ConvertAmountExchange
				amount={formatToken({ value, unitName: token.decimals, displayDecimals: token.decimals })}
				{exchangeRate}
			/>
			{#if nonNullish(estimate)}
				<span>· {signaturesText(estimate)}</span>
			{/if}
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
			{$i18n.usage_credits.text.description}

			<ExternalLink
				ariaLabel={$i18n.settings.text.learn_more}
				href={OISY_USAGE_CREDITS_DOCS_URL}
				iconVisible={false}
				trackEvent={buildLearnMoreEvent({
					sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.TOOLS_PAGE,
					sourceSublocation: 'usage_credits',
					labelKey: 'settings.text.learn_more',
					url: OISY_USAGE_CREDITS_DOCS_URL
				})}>{$i18n.settings.text.learn_more}</ExternalLink
			>
		</p>

		<SettingsCardItem>
			{#snippet key()}
				<span class="flex flex-col">
					{$i18n.usage_credits.text.free_signatures}
					{#if nonNullish(free)}
						<output class="text-sm text-tertiary" data-tid={TOOLS_USAGE_CREDITS_FREE_SIGNATURES}
							>~{signatures(free)}</output
						>
					{:else if loadFailed}
						<span class="text-sm text-tertiary" data-tid={TOOLS_USAGE_CREDITS_FREE_SIGNATURES}
							>{$i18n.core.text.not_available}</span
						>
					{:else}
						<span class="mt-1 w-20"><SkeletonText /></span>
					{/if}
				</span>
			{/snippet}
		</SettingsCardItem>

		<SettingsCardItem>
			{#snippet key()}
				<span class="flex flex-col">
					{$i18n.usage_credits.text.own_credits}
					{@render amount(ownCycles?.approved, TOOLS_USAGE_CREDITS_OWN_CREDITS, {
						limit: previousLimit,
						estimate: chargeable
					})}
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
					{$i18n.usage_credits.text.balance}
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

		<!-- The amounts above are both true, but signing can only charge what the balance holds: the
		     estimate counts that, and this says why. No fiat value: the balance row above shows it. -->
		{#if nonNullish(ownCycles) && ownCycles.approved > ownCycles.balance}
			<MessageBox
				level="warning"
				styleClass="mt-4 mb-0!"
				testId={TOOLS_USAGE_CREDITS_BALANCE_SHORT}
			>
				{ownCycles.balance === ZERO
					? $i18n.usage_credits.text.balance_empty
					: replacePlaceholders($i18n.usage_credits.text.balance_short, {
							$amount: formatToken({ value: ownCycles.balance, unitName: token.decimals }),
							$token: token.symbol
						})}
			</MessageBox>
		{/if}
	</SettingsCard>

	{#if addModalOpen && nonNullish(ownCycles)}
		<ToolsUsageCreditsModal onError={load} {ownCycles} {token} />
	{:else if mintModalOpen}
		<CyclesMintModal destinationToken={token} />
	{/if}
{/if}
