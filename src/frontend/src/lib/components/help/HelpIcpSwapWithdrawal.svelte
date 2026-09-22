<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Identity } from '@icp-sdk/core/agent';
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
		HELP_ICPSWAP_NO_TOKENS,
		HELP_ICPSWAP_POOL_GROUP,
		HELP_ICPSWAP_RESULTS_SUMMARY,
		HELP_ICPSWAP_SCAN_BUTTON,
		HELP_ICPSWAP_SCAN_SUMMARY,
		HELP_ICPSWAP_TOKEN_A,
		HELP_ICPSWAP_TOKEN_B
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import {
		PLAUSIBLE_EVENT_RESULT_STATUSES,
		PLAUSIBLE_EVENT_SUBCONTEXT_HELP
	} from '$lib/enums/plausible';
	import { toHelpErrorType, trackHelp } from '$lib/services/help-analytics.services';
	import {
		IcpSwapPoolNotFoundError,
		loadIcpSwapRecoverableBalances,
		reloadIcpSwapPoolBalances,
		scanIcpSwapPools,
		withdrawIcpSwapBalance,
		type IcpSwapPoolBalances,
		type IcpSwapRecoverableBalance
	} from '$lib/services/icp-swap-recovery.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	let tokenA = $state<IcToken | undefined>();
	let tokenB = $state<IcToken | undefined>();

	let loadError = $state<string | undefined>();
	// Both entry points produce the same shape: the scan can return several pools, naming a pair
	// returns one.
	let groups = $state<IcpSwapPoolBalances[] | undefined>();
	let scanSummary = $state<{ poolsScanned: number; unreadablePools: number } | undefined>();
	// The row currently being withdrawn, so only its own button spins.
	let withdrawingKey = $state<string | undefined>();

	// Neither selector is disabled while a lookup runs, so a second lookup - or a lookup racing a
	// scan - can be in flight before the first settles. Results are therefore claimed by
	// generation: a request that is no longer the newest drops its UI writes instead of
	// overwriting fresher ones, and only the newest may clear `busy`. Analytics stay unguarded,
	// since the call really did complete and dropping it would leave a `scan` `executing` event
	// with no terminal event.
	let requestGeneration = 0;

	// Which entry point is running, not merely that one is: `busy` alone cannot tell them apart,
	// so a manual lookup used to spin the scan button as though a scan were under way.
	let activeRequest = $state<'scan' | 'lookup' | undefined>();

	const busy = $derived(nonNullish(activeRequest));

	// A withdrawal is deliberately not folded into `busy`: that one also drives the "checking"
	// line, the empty message and the unreadable-pool summary, which must keep describing the pool
	// the user is withdrawing from. Discovery, on the other hand, must not start under a
	// withdrawal - `startRequest` clears `groups`, which drops the withdrawal's own re-read and
	// lets a pool read before the withdrawal landed re-display the row it just emptied.
	const discoveryLocked = $derived(busy || nonNullish(withdrawingKey));

	const startRequest = (kind: 'scan' | 'lookup'): number => {
		activeRequest = kind;
		reset();

		return ++requestGeneration;
	};

	const isCurrentRequest = (generation: number): boolean => generation === requestGeneration;

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

		const generation = startRequest('scan');

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

			if (isCurrentRequest(generation)) {
				groups = pools;
				scanSummary = { poolsScanned, unreadablePools };
			}

			trackHelp({
				action: 'scan',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				balancesFound: pools.reduce((acc, { balances }) => acc + balances.length, 0),
				poolsScanned
			});
		} catch (err: unknown) {
			if (isCurrentRequest(generation)) {
				loadError = $i18n.help.error.scan_failed;
			}

			trackHelp({
				action: 'scan',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				errorType: toHelpErrorType(err)
			});
		} finally {
			if (isCurrentRequest(generation)) {
				activeRequest = undefined;
			}
		}
	};

	const loadBalances = async () => {
		const identity = $authIdentity;

		if (isNullish(identity) || isNullish(tokenA) || isNullish(tokenB)) {
			return;
		}

		const generation = startRequest('lookup');

		const [symbolA, symbolB] = [tokenA.symbol, tokenB.symbol];

		try {
			const pool = await loadIcpSwapRecoverableBalances({ identity, tokenA, tokenB });

			if (isCurrentRequest(generation)) {
				groups = [pool];
			}

			trackHelp({
				action: 'select_pool',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				token: symbolA,
				token2: symbolB,
				balancesFound: pool.balances.length
			});
		} catch (err: unknown) {
			if (isCurrentRequest(generation)) {
				loadError =
					err instanceof IcpSwapPoolNotFoundError
						? $i18n.help.error.pool_not_found
						: $i18n.help.error.load_failed;
			}

			trackHelp({
				action: 'select_pool',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				token: symbolA,
				token2: symbolB,
				errorType: toHelpErrorType(err)
			});
		} finally {
			if (isCurrentRequest(generation)) {
				activeRequest = undefined;
			}
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

	// Replaces one group with a fresh read of its pool. The withdrawal has already succeeded by the
	// time this runs, so a failing re-read must not surface as a failed withdrawal: it falls back
	// to dropping the withdrawn row, which is what the list would have shown anyway.
	const refreshPool = async ({
		identity,
		poolCanisterId,
		withdrawnToken
	}: {
		identity: Identity;
		poolCanisterId: string;
		withdrawnToken: IcToken;
	}) => {
		const group = groups?.find(({ poolCanisterId: id }) => id === poolCanisterId);

		const dropWithdrawnRow = ({ balances, ...rest }: IcpSwapPoolBalances) => ({
			...rest,
			balances: balances.filter(
				({ token: { ledgerCanisterId } }) => ledgerCanisterId !== withdrawnToken.ledgerCanisterId
			)
		});

		const replacement = nonNullish(group)
			? await reloadIcpSwapPoolBalances({ identity, pool: group, tokens: candidateTokens }).catch(
					() => dropWithdrawnRow(group)
				)
			: undefined;

		if (isNullish(replacement)) {
			return;
		}

		groups = groups
			?.map((g) => (g.poolCanisterId === poolCanisterId ? replacement : g))
			.filter(({ balances }) => balances.length > 0);
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

			// The row masks the amount under privacy mode, so the toast that confirms the same
			// withdrawal must not print it either. Worth keeping otherwise: `withdrawn` is what the
			// pool actually moved, which can exceed the amount captured at discovery.
			toastsShow({
				text: $isPrivacyMode
					? replacePlaceholders($i18n.help.success.withdraw_hidden, { $symbol: token.symbol })
					: replacePlaceholders($i18n.help.success.withdraw, {
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

			// Re-read just this pool - one query against a canister id we already hold, not another
			// factory sweep. Withdrawal moves the amount captured at discovery, so a balance
			// credited in between would otherwise vanish with the row instead of being offered.
			await refreshPool({ identity, poolCanisterId, withdrawnToken: token });
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.help.error.withdraw_failed }, err });

			trackHelp({
				action: 'withdraw',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				token: token.symbol,
				tokenStandard: token.standard.code,
				errorType: toHelpErrorType(err)
			});
		} finally {
			withdrawingKey = undefined;
		}
	};

	// A pool with every row filtered out as dust still comes back as a group, so results are
	// counted by rows rather than by groups - otherwise an empty pool renders a bare heading and
	// suppresses the "nothing found" message.
	// With no enabled ICRC tokens the candidate set is ICP alone, so choosing it on one side leaves
	// the other with nothing to offer. The explanation belongs in the card rather than inside a
	// dropdown the user cannot open, and it is a full sentence that would not fit the trigger.
	let noTokensToPick = $derived(
		otherTokens(tokenA).length === 0 || otherTokens(tokenB).length === 0
	);

	let visibleGroups = $derived((groups ?? []).filter(({ balances }) => balances.length > 0));
	let hasResults = $derived(visibleGroups.length > 0);

	let withdrawableCount = $derived(
		visibleGroups.reduce((count, { balances }) => count + balances.length, 0)
	);
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
			disabled={discoveryLocked}
			loading={activeRequest === 'scan'}
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
					disabled={discoveryLocked}
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
					disabled={discoveryLocked}
					onSelect={onSelectB}
					selected={tokenB}
					testId={HELP_ICPSWAP_TOKEN_B}
					tokens={otherTokens(tokenA)}
				/>
			{/snippet}
		</SettingsCardItem>

		{#if noTokensToPick}
			<p class="mt-3 text-sm text-tertiary" data-tid={HELP_ICPSWAP_NO_TOKENS}>
				{$i18n.help.text.no_tokens}
			</p>
		{/if}

		<!-- Always in the DOM: a polite live region is announced when its content changes, not when
		     the region itself is inserted, so the paragraphs have to swap inside it. -->
		<div aria-live="polite" role="status">
			{#if busy}
				<p class="mt-3 text-sm text-tertiary" data-tid={HELP_ICPSWAP_LOADING}>
					{$i18n.help.text.checking_pool}
				</p>
			{:else if showEmpty && (isNullish(scanSummary) || scanSummary.unreadablePools === 0)}
				<p class="mt-3 text-sm text-tertiary" data-tid={HELP_ICPSWAP_EMPTY}>
					{nonNullish(scanSummary)
						? replacePlaceholders($i18n.help.text.scan_nothing_found, {
								$pools: `${scanSummary.poolsScanned}`
							})
						: $i18n.help.text.nothing_to_withdraw}
				</p>
			{:else if hasResults}
				<!-- The visible success state is a list of rows, with no sentence saying the lookup
				     finished, so the announcement is the one thing here that is screen-reader only. -->
				<p class="sr-only" data-tid={HELP_ICPSWAP_RESULTS_SUMMARY}>
					{replacePlaceholders($i18n.help.text.results_found, {
						$balances: `${withdrawableCount}`
					})}
				</p>
			{/if}
		</div>

		{#if nonNullish(loadError)}
			<p class="mt-3 text-sm text-error-primary" data-tid={HELP_ICPSWAP_ERROR} role="alert">
				{loadError}
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
			<p class="mt-3 text-sm text-error-primary" data-tid={HELP_ICPSWAP_SCAN_SUMMARY} role="alert">
				{replacePlaceholders($i18n.help.text.scan_unreadable, {
					$unreadable: `${scanSummary.unreadablePools}`,
					$pools: `${scanSummary.poolsScanned}`
				})}
			</p>
		{/if}
	</SettingsCard>
</div>
