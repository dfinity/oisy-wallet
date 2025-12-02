<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { icrcTokens, icrcCustomTokensNotInitialized } from '$icp/derived/icrc.derived';
	import { loadCustomTokens } from '$icp/services/icrc.services';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import type { IcToken } from '$icp/types/ic-token';
	import { setCustomToken } from '$icp-eth/services/custom-token.services';
	import { isGLDTToken } from '$icp-eth/utils/token.utils';
	import GetTokenModal from '$lib/components/get-token/GetTokenModal.svelte';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import StakeModal from '$lib/components/stake/StakeModal.svelte';
	import SwapContexts from '$lib/components/swap/SwapContexts.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonWithModal from '$lib/components/ui/ButtonWithModal.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { modalGetToken, modalGldtStake } from '$lib/derived/modal.derived';
	import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { autoLoadSingleToken } from '$lib/services/token.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { formatCurrency, formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		gldtToken?: IcToken;
	}

	let { gldtToken }: Props = $props();

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	let currentApy = $derived($gldtStakeStore?.apy ?? 0);

	let gldtTokenBalanceToStake = $derived(
		nonNullish(gldtToken)
			? ($balancesStore?.[gldtToken?.id]?.data ?? ZERO) - gldtToken.fee * 2n
			: ZERO
	);

	let gldtTokenSymbol = $derived(nonNullish(gldtToken) ? getTokenDisplaySymbol(gldtToken) : 'GLDT');

	let gldtTokenExchangeRate = $derived(
		nonNullish(gldtToken) ? ($exchanges?.[gldtToken.id]?.usd ?? 0) : 0
	);

	let gldtStakeButtonDisabled = $derived(gldtTokenBalanceToStake <= ZERO);

	let potentialGldtTokenBalance = $derived(
		gldtTokenExchangeRate > 0 && $enabledMainnetFungibleTokensUsdBalance > 0
			? Math.round($enabledMainnetFungibleTokensUsdBalance / gldtTokenExchangeRate)
			: 0
	);

	let getMoreTokensButtonDisabled = $derived(potentialGldtTokenBalance <= 0);

	const enableStakingToken = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		const token = $icrcTokens.find((token) => isGLDTToken(token));

		await autoLoadSingleToken({
			token,
			identity: $authIdentity,
			setToken: setCustomToken,
			loadTokens: loadCustomTokens,
			errorMessage: $i18n.init.error.icrc_custom_token
		});
	};
</script>

<StakeContentCard>
	{#snippet content()}
		<div class="text-sm">{$i18n.stake.text.earning_potential}</div>

		<div
			class="my-1 text-lg font-bold sm:text-xl"
			class:text-brand-primary-alt={$enabledMainnetFungibleTokensUsdBalance > 0}
			class:text-tertiary={$enabledMainnetFungibleTokensUsdBalance === 0}
		>
			{`${$enabledMainnetFungibleTokensUsdBalance > 0 && currentApy > 0 ? '+' : ''}`}{replacePlaceholders(
				$i18n.stake.text.active_earning_per_year,
				{
					$amount: `${formatCurrency({
						value: ($enabledMainnetFungibleTokensUsdBalance * currentApy) / 100,
						currency: $currentCurrency,
						exchangeRate: $currencyExchangeStore,
						language: $currentLanguage
					})}`
				}
			)}
		</div>

		{#if $icrcCustomTokensNotInitialized || nonNullish(gldtToken)}
			<div class="flex items-center justify-center gap-2 text-sm sm:text-base">
				{#if $enabledMainnetFungibleTokensUsdBalance > 0}
					<span class="font-bold">
						{formatCurrency({
							value: $enabledMainnetFungibleTokensUsdBalance,
							currency: $currentCurrency,
							exchangeRate: $currencyExchangeStore,
							language: $currentLanguage
						})}
					</span>
				{/if}

				{#if nonNullish(gldtToken)}
					<span class="text-tertiary" in:fade>
						{`${potentialGldtTokenBalance > 0 ? '~' : ''}${potentialGldtTokenBalance}`}
						{gldtTokenSymbol}
					</span>
				{:else}
					<div class="w-16">
						<SkeletonText />
					</div>
				{/if}
			</div>
		{:else}
			<span class="text-tertiary">
				{replacePlaceholders($i18n.stake.text.enable_token_text, {
					$token_symbol: gldtTokenSymbol
				})}
			</span>
		{/if}
	{/snippet}

	{#snippet buttons()}
		{#if nonNullish(gldtToken)}
			<ButtonWithModal isOpen={$modalGetToken} onOpen={modalStore.openGetToken}>
				{#snippet button(onclick)}
					<Button disabled={gldtStakeButtonDisabled} fullWidth {onclick}>
						{replacePlaceholders(
							getMoreTokensButtonDisabled
								? $i18n.stake.text.get_tokens
								: $i18n.stake.text.get_tokens_with_amount,
							{
								$token_symbol: gldtTokenSymbol,
								$amount: `${potentialGldtTokenBalance}`
							}
						)}
					</Button>
				{/snippet}

				{#snippet modal()}
					<SwapContexts>
						<GetTokenModal
							{currentApy}
							receiveAddress={$icrcAccountIdentifierText}
							token={gldtToken}
						/>
					</SwapContexts>
				{/snippet}
			</ButtonWithModal>

			<ButtonWithModal isOpen={$modalGldtStake} onOpen={modalStore.openGldtStake}>
				{#snippet button(onclick)}
					<Button colorStyle="success" disabled={gldtStakeButtonDisabled} fullWidth {onclick}>
						{replacePlaceholders(
							gldtStakeButtonDisabled
								? $i18n.stake.text.not_enough_to_stake
								: $i18n.stake.text.stake_amount,
							{
								$token_symbol: gldtTokenSymbol,
								$amount: formatToken({
									value: gldtTokenBalanceToStake,
									unitName: gldtToken.decimals,
									displayDecimals: 2
								})
							}
						)}
					</Button>
				{/snippet}

				{#snippet modal()}
					<StakeModal token={gldtToken} />
				{/snippet}
			</ButtonWithModal>
		{:else}
			<Button fullWidth loading={$icrcCustomTokensNotInitialized} onclick={enableStakingToken}>
				{replacePlaceholders($i18n.stake.text.enable_token_button, {
					$token_symbol: gldtTokenSymbol
				})}
			</Button>
		{/if}
	{/snippet}
</StakeContentCard>
