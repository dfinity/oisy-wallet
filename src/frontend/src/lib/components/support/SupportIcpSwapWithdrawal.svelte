<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
	import type { IcToken } from '$icp/types/ic-token';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import SupportIcpSwapBalance from '$lib/components/support/SupportIcpSwapBalance.svelte';
	import SupportTokenDropdown from '$lib/components/support/SupportTokenDropdown.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import {
		SUPPORT_ICPSWAP_CARD,
		SUPPORT_ICPSWAP_EMPTY,
		SUPPORT_ICPSWAP_ERROR,
		SUPPORT_ICPSWAP_LOADING,
		SUPPORT_ICPSWAP_TOKEN_A,
		SUPPORT_ICPSWAP_TOKEN_B
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		PLAUSIBLE_EVENT_RESULT_STATUSES,
		PLAUSIBLE_EVENT_SUBCONTEXT_SUPPORT
	} from '$lib/enums/plausible';
	import {
		IcpSwapPoolNotFoundError,
		loadIcpSwapRecoverableBalances,
		withdrawIcpSwapBalance,
		type IcpSwapPoolBalances,
		type IcpSwapRecoverableBalance
	} from '$lib/services/icp-swap-recovery.services';
	import { trackSupport } from '$lib/services/support-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { replaceIcErrorFields } from '$lib/utils/error.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	let tokenA = $state<IcToken | undefined>();
	let tokenB = $state<IcToken | undefined>();

	let loading = $state(false);
	let loadError = $state<string | undefined>();
	let result = $state<IcpSwapPoolBalances | undefined>();
	// The row currently being withdrawn, so only its own button spins.
	let withdrawingKey = $state<string | undefined>();

	const rowKey = ({ token, kind }: IcpSwapRecoverableBalance): string =>
		`${token.ledgerCanisterId}-${kind}`;

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

	const loadBalances = async () => {
		const identity = $authIdentity;

		if (isNullish(identity) || isNullish(tokenA) || isNullish(tokenB)) {
			return;
		}

		loading = true;
		loadError = undefined;
		result = undefined;

		const [symbolA, symbolB] = [tokenA.symbol, tokenB.symbol];

		try {
			const balances = await loadIcpSwapRecoverableBalances({ identity, tokenA, tokenB });

			result = balances;

			trackSupport({
				action: 'select_pool',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_SUPPORT.ICPSWAP_WITHDRAWAL,
				token: symbolA,
				token2: symbolB,
				balancesFound: balances.balances.length
			});
		} catch (err: unknown) {
			loadError =
				err instanceof IcpSwapPoolNotFoundError
					? $i18n.support.error.pool_not_found
					: $i18n.support.error.load_failed;

			trackSupport({
				action: 'select_pool',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_SUPPORT.ICPSWAP_WITHDRAWAL,
				token: symbolA,
				token2: symbolB,
				error: replaceIcErrorFields(err)
			});
		} finally {
			loading = false;
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

	const onWithdraw = async (balance: IcpSwapRecoverableBalance) => {
		const identity = $authIdentity;
		const poolCanisterId = result?.poolCanisterId;

		if (isNullish(identity) || isNullish(poolCanisterId)) {
			return;
		}

		const { token, kind } = balance;

		withdrawingKey = rowKey(balance);

		trackSupport({
			action: 'withdraw',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
			subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_SUPPORT.ICPSWAP_WITHDRAWAL,
			token: token.symbol,
			tokenStandard: token.standard.code,
			balanceKind: kind
		});

		try {
			const withdrawn = await withdrawIcpSwapBalance({ identity, poolCanisterId, balance });

			toastsShow({
				text: replacePlaceholders($i18n.support.success.withdraw, {
					$amount: formatToken({ value: withdrawn, unitName: token.decimals }),
					$symbol: token.symbol
				}),
				level: 'success',
				duration: 4000
			});

			trackSupport({
				action: 'withdraw',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_SUPPORT.ICPSWAP_WITHDRAWAL,
				token: token.symbol,
				tokenStandard: token.standard.code,
				balanceKind: kind
			});

			// Re-read the pool so the withdrawn row disappears; a failure above deliberately
			// leaves the list untouched so the user can retry.
			await loadBalances();
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.support.error.withdraw_failed }, err });

			trackSupport({
				action: 'withdraw',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_SUPPORT.ICPSWAP_WITHDRAWAL,
				token: token.symbol,
				tokenStandard: token.standard.code,
				balanceKind: kind,
				error: replaceIcErrorFields(err)
			});
		} finally {
			withdrawingKey = undefined;
		}
	};

	let balances = $derived(result?.balances ?? []);
	let showEmpty = $derived(nonNullish(result) && balances.length === 0 && !loading);
</script>

<div data-tid={SUPPORT_ICPSWAP_CARD}>
	<SettingsCard>
		{#snippet title()}{$i18n.support.text.icpswap_title}{/snippet}

		<p class="mb-3 text-sm text-tertiary">
			{replaceOisyPlaceholders($i18n.support.text.icpswap_description)}
		</p>

		<SettingsCardItem>
			{#snippet key()}
				{$i18n.support.text.token_first}
			{/snippet}

			{#snippet value()}
				<SupportTokenDropdown
					ariaLabel={$i18n.support.alt.select_token_first}
					onSelect={onSelectA}
					selected={tokenA}
					testId={SUPPORT_ICPSWAP_TOKEN_A}
					tokens={otherTokens(tokenB)}
				/>
			{/snippet}
		</SettingsCardItem>

		<SettingsCardItem>
			{#snippet key()}
				{$i18n.support.text.token_second}
			{/snippet}

			{#snippet value()}
				<SupportTokenDropdown
					ariaLabel={$i18n.support.alt.select_token_second}
					onSelect={onSelectB}
					selected={tokenB}
					testId={SUPPORT_ICPSWAP_TOKEN_B}
					tokens={otherTokens(tokenA)}
				/>
			{/snippet}
		</SettingsCardItem>

		{#if loading}
			<p class="mt-3 text-sm text-tertiary" data-tid={SUPPORT_ICPSWAP_LOADING}>
				{$i18n.support.text.checking_pool}
			</p>
		{:else if nonNullish(loadError)}
			<p class="mt-3 text-sm text-error-primary" data-tid={SUPPORT_ICPSWAP_ERROR}>
				{loadError}
			</p>
		{:else if showEmpty}
			<p class="mt-3 text-sm text-tertiary" data-tid={SUPPORT_ICPSWAP_EMPTY}>
				{$i18n.support.text.nothing_to_withdraw}
			</p>
		{:else if balances.length > 0}
			<Hr spacing="md" />

			{#each balances as balance (rowKey(balance))}
				<SupportIcpSwapBalance
					{balance}
					disabled={nonNullish(withdrawingKey)}
					loading={withdrawingKey === rowKey(balance)}
					onWithdraw={() => onWithdraw(balance)}
				/>
			{/each}
		{/if}
	</SettingsCard>
</div>
