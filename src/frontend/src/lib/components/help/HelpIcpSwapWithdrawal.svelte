<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
	import type { IcToken } from '$icp/types/ic-token';
	import HelpIcpSwapBalance from '$lib/components/help/HelpIcpSwapBalance.svelte';
	import HelpTokenDropdown from '$lib/components/help/HelpTokenDropdown.svelte';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import {
		HELP_ICPSWAP_CARD,
		HELP_ICPSWAP_EMPTY,
		HELP_ICPSWAP_ERROR,
		HELP_ICPSWAP_LOADING,
		HELP_ICPSWAP_POOL_GROUP,
		HELP_ICPSWAP_SCAN_BUTTON,
		HELP_ICPSWAP_SCAN_SUMMARY,
		HELP_ICPSWAP_TOKEN_A,
		HELP_ICPSWAP_TOKEN_B
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		PLAUSIBLE_EVENT_RESULT_STATUSES,
		PLAUSIBLE_EVENT_SUBCONTEXT_HELP
	} from '$lib/enums/plausible';
	import { trackHelp } from '$lib/services/help-analytics.services';
	import {
		IcpSwapPoolNotFoundError,
		loadIcpSwapRecoverableBalances,
		scanIcpSwapPools,
		withdrawIcpSwapBalance,
		type IcpSwapPoolBalances,
		type IcpSwapRecoverableBalance
	} from '$lib/services/icp-swap-recovery.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { replaceIcErrorFields } from '$lib/utils/error.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	let tokenA = $state<IcToken | undefined>();
	let tokenB = $state<IcToken | undefined>();

	let busy = $state(false);
	let loadError = $state<string | undefined>();
	// Both entry points produce the same shape: the scan can return several pools, naming a pair
	// returns one.
	let groups = $state<IcpSwapPoolBalances[] | undefined>();
	let scanSummary = $state<{ poolsScanned: number; unreadablePools: number } | undefined>();
	// The row currently being withdrawn, so only its own button spins.
	let withdrawingKey = $state<string | undefined>();

	// ICP is not an ICRC token - it has its own `icp` standard and lives outside the ICRC stores -
	// so `enabledIcrcTokens` does not contain it, even though it is one side of most ICPSwap pools.
	// The swap UI has the same gap and closes it the same way, by prepending ICP_TOKEN to its
	// universe (see `allSwapUniverseTokens`). The selector sorts by symbol, so this order only
	// decides which entry wins if a custom token ever duplicates the ICP ledger.
	const candidateTokens = $derived([ICP_TOKEN as IcToken, ...$enabledIcrcTokens]);

	// A pair needs two distinct tokens: the pool is between them, so the same token twice
	// identifies nothing.
	const otherTokens = (exclude: IcToken | undefined): IcToken[] =>
		candidateTokens.filter(
			({ ledgerCanisterId }) => ledgerCanisterId !== exclude?.ledgerCanisterId
		);

	const rowKey = ({
		poolCanisterId,
		balance: { token }
	}: {
		poolCanisterId: string;
		balance: IcpSwapRecoverableBalance;
	}): string => `${poolCanisterId}-${token.ledgerCanisterId}`;

	const reset = () => {
		loadError = undefined;
		groups = undefined;
		scanSummary = undefined;
	};

	const onScan = async () => {
		const identity = $authIdentity;

		if (isNullish(identity)) {
			return;
		}

		busy = true;
		reset();

		trackHelp({
			action: 'scan',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
			subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL
		});

		try {
			const { pools, poolsScanned, unreadablePools } = await scanIcpSwapPools({
				identity,
				tokens: candidateTokens
			});

			groups = pools;
			scanSummary = { poolsScanned, unreadablePools };

			trackHelp({
				action: 'scan',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				balancesFound: pools.reduce((acc, { balances }) => acc + balances.length, 0),
				poolsScanned
			});
		} catch (err: unknown) {
			loadError = $i18n.help.error.scan_failed;

			trackHelp({
				action: 'scan',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				error: replaceIcErrorFields(err)
			});
		} finally {
			busy = false;
		}
	};

	const loadBalances = async () => {
		const identity = $authIdentity;

		if (isNullish(identity) || isNullish(tokenA) || isNullish(tokenB)) {
			return;
		}

		busy = true;
		reset();

		const [symbolA, symbolB] = [tokenA.symbol, tokenB.symbol];

		try {
			const pool = await loadIcpSwapRecoverableBalances({ identity, tokenA, tokenB });

			groups = [pool];

			trackHelp({
				action: 'select_pool',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				token: symbolA,
				token2: symbolB,
				balancesFound: pool.balances.length
			});
		} catch (err: unknown) {
			loadError =
				err instanceof IcpSwapPoolNotFoundError
					? $i18n.help.error.pool_not_found
					: $i18n.help.error.load_failed;

			trackHelp({
				action: 'select_pool',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				token: symbolA,
				token2: symbolB,
				error: replaceIcErrorFields(err)
			});
		} finally {
			busy = false;
		}
	};

	const onSelectA = async (token: IcToken) => {
		tokenA = token;
		await loadBalances();
	};

	const onSelectB = async (token: IcToken) => {
		tokenB = token;
		await loadBalances();
	};

	const onWithdraw = async ({
		poolCanisterId,
		balance
	}: {
		poolCanisterId: string;
		balance: IcpSwapRecoverableBalance;
	}) => {
		const identity = $authIdentity;

		if (isNullish(identity)) {
			return;
		}

		const { token } = balance;

		withdrawingKey = rowKey({ poolCanisterId, balance });

		trackHelp({
			action: 'withdraw',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
			subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
			token: token.symbol,
			tokenStandard: token.standard.code
		});

		try {
			const withdrawn = await withdrawIcpSwapBalance({ identity, poolCanisterId, balance });

			toastsShow({
				text: replacePlaceholders($i18n.help.success.withdraw, {
					$amount: formatToken({ value: withdrawn, unitName: token.decimals }),
					$symbol: token.symbol
				}),
				level: 'success',
				duration: 4000
			});

			trackHelp({
				action: 'withdraw',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				token: token.symbol,
				tokenStandard: token.standard.code
			});

			// Drop the withdrawn row locally rather than re-running the whole scan, which would cost
			// another full pool sweep. A failure deliberately leaves the row in place to retry.
			groups = groups
				?.map((group) =>
					group.poolCanisterId === poolCanisterId
						? {
								...group,
								balances: group.balances.filter(
									({ token: { ledgerCanisterId } }) => ledgerCanisterId !== token.ledgerCanisterId
								)
							}
						: group
				)
				.filter(({ balances }) => balances.length > 0);
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.help.error.withdraw_failed }, err });

			trackHelp({
				action: 'withdraw',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				token: token.symbol,
				tokenStandard: token.standard.code,
				error: replaceIcErrorFields(err)
			});
		} finally {
			withdrawingKey = undefined;
		}
	};

	// A pool with every row filtered out as dust still comes back as a group, so results are
	// counted by rows rather than by groups - otherwise an empty pool renders a bare heading and
	// suppresses the "nothing found" message.
	let visibleGroups = $derived((groups ?? []).filter(({ balances }) => balances.length > 0));
	let hasResults = $derived(visibleGroups.length > 0);
	let showEmpty = $derived(nonNullish(groups) && !hasResults && !busy);
</script>

<div data-tid={HELP_ICPSWAP_CARD}>
	<SettingsCard>
		{#snippet title()}{$i18n.help.text.icpswap_title}{/snippet}

		<p class="mb-3 text-sm text-tertiary">
			{replaceOisyPlaceholders($i18n.help.text.icpswap_description)}
		</p>

		<Button
			ariaLabel={$i18n.help.alt.scan}
			disabled={busy}
			loading={busy && isNullish(groups) && isNullish(loadError)}
			onclick={onScan}
			testId={HELP_ICPSWAP_SCAN_BUTTON}
		>
			{$i18n.help.text.scan}
		</Button>

		<p class="mt-2 text-sm text-tertiary">{$i18n.help.text.scan_hint}</p>

		<Hr spacing="md" />

		<p class="text-xs font-semibold tracking-wide text-tertiary uppercase">
			{$i18n.help.text.or_pick_a_pair}
		</p>

		<SettingsCardItem>
			{#snippet key()}
				{$i18n.help.text.token_first}
			{/snippet}

			{#snippet value()}
				<HelpTokenDropdown
					ariaLabel={$i18n.help.alt.select_token_first}
					onSelect={onSelectA}
					selected={tokenA}
					testId={HELP_ICPSWAP_TOKEN_A}
					tokens={otherTokens(tokenB)}
				/>
			{/snippet}
		</SettingsCardItem>

		<SettingsCardItem>
			{#snippet key()}
				{$i18n.help.text.token_second}
			{/snippet}

			{#snippet value()}
				<HelpTokenDropdown
					ariaLabel={$i18n.help.alt.select_token_second}
					onSelect={onSelectB}
					selected={tokenB}
					testId={HELP_ICPSWAP_TOKEN_B}
					tokens={otherTokens(tokenA)}
				/>
			{/snippet}
		</SettingsCardItem>

		{#if busy}
			<p class="mt-3 text-sm text-tertiary" data-tid={HELP_ICPSWAP_LOADING}>
				{$i18n.help.text.checking_pool}
			</p>
		{:else if nonNullish(loadError)}
			<p class="mt-3 text-sm text-error-primary" data-tid={HELP_ICPSWAP_ERROR}>
				{loadError}
			</p>
		{:else if showEmpty}
			<p class="mt-3 text-sm text-tertiary" data-tid={HELP_ICPSWAP_EMPTY}>
				{nonNullish(scanSummary)
					? replacePlaceholders($i18n.help.text.scan_nothing_found, {
							$pools: `${scanSummary.poolsScanned}`
						})
					: $i18n.help.text.nothing_to_withdraw}
			</p>
		{/if}

		{#if hasResults}
			<Hr spacing="md" />

			{#each visibleGroups as group (group.poolCanisterId)}
				<div class="mt-3" data-tid={`${HELP_ICPSWAP_POOL_GROUP}-${group.poolCanisterId}`}>
					<!-- No `uppercase` here: these are token symbols, and casing is part of them
					     (ckUSDC, not CKUSDC). -->
					<p class="text-xs font-semibold tracking-wide text-tertiary">
						{group.pair[0]} / {group.pair[1]}
					</p>

					{#each group.balances as balance (rowKey( { poolCanisterId: group.poolCanisterId, balance } ))}
						<HelpIcpSwapBalance
							{balance}
							disabled={nonNullish(withdrawingKey)}
							loading={withdrawingKey === rowKey({ poolCanisterId: group.poolCanisterId, balance })}
							onWithdraw={() => onWithdraw({ poolCanisterId: group.poolCanisterId, balance })}
							testIdSuffix={group.poolCanisterId}
						/>
					{/each}
				</div>
			{/each}
		{/if}

		{#if nonNullish(scanSummary) && scanSummary.unreadablePools > 0 && !busy}
			<p class="mt-3 text-sm text-error-primary" data-tid={HELP_ICPSWAP_SCAN_SUMMARY}>
				{replacePlaceholders($i18n.help.text.scan_unreadable, {
					$unreadable: `${scanSummary.unreadablePools}`,
					$pools: `${scanSummary.poolsScanned}`
				})}
			</p>
		{/if}
	</SettingsCard>
</div>
