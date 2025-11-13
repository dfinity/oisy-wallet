<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { icrcTokens, icrcCustomTokensNotInitialized } from '$icp/derived/icrc.derived';
	import { loadCustomTokens } from '$icp/services/icrc.services';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import type { IcToken } from '$icp/types/ic-token';
	import { setCustomToken } from '$icp-eth/services/custom-token.services';
	import { isGLDTToken } from '$icp-eth/utils/token.utils';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import StakeModal from '$lib/components/stake/StakeModal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonWithModal from '$lib/components/ui/ButtonWithModal.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { modalGldtStake } from '$lib/derived/modal.derived';
	import { enabledFungibleTokensUi } from '$lib/derived/tokens.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { autoLoadSingleToken } from '$lib/services/token.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
	import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';

	interface Props {
		gldtToken?: IcToken;
	}

	let { gldtToken }: Props = $props();

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	let currentApy = $derived($gldtStakeStore?.apy ?? 0);

	let gldtTokenBalance = $derived(
		nonNullish(gldtToken) ? ($balancesStore?.[gldtToken?.id]?.data ?? ZERO) : ZERO
	);

	let gldtTokenSymbol = $derived(nonNullish(gldtToken) ? getTokenDisplaySymbol(gldtToken) : 'GLDT');

	let gldtTokenExchangeRate = $derived(
		nonNullish(gldtToken) ? ($exchanges?.[gldtToken.id]?.usd ?? 0) : 0
	);

	let gldtStakeButtonDisabled = $derived(gldtTokenBalance - (gldtToken?.fee ?? ZERO) * 2n <= ZERO);

	let totalUsdBalance = $derived(sumTokensUiUsdBalance($enabledFungibleTokensUi));

	let potentialGldtTokenBalance = $derived(
		gldtTokenExchangeRate > 0 && totalUsdBalance > 0
			? Math.round(totalUsdBalance / gldtTokenExchangeRate)
			: 0
	);

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
			class:text-brand-primary-alt={totalUsdBalance > 0}
			class:text-tertiary={totalUsdBalance === 0}
		>
			{`${totalUsdBalance > 0 && currentApy > 0 ? '+' : ''}`}{replacePlaceholders(
				$i18n.stake.text.active_earning_per_year,
				{
					$amount: `${formatCurrency({
						value: (totalUsdBalance * currentApy) / 100,
						currency: $currentCurrency,
						exchangeRate: $currencyExchangeStore,
						language: $currentLanguage
					})}`
				}
			)}
		</div>

		{#if $icrcCustomTokensNotInitialized || nonNullish(gldtToken)}
			<div class="flex justify-center gap-2 text-sm sm:text-base">
				{#if totalUsdBalance > 0}
					<span class="font-bold">
						{formatCurrency({
							value: totalUsdBalance,
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
			<ButtonWithModal isOpen={$modalGldtStake} onOpen={modalStore.openGldtStake}>
				{#snippet button(onclick)}
					<Button disabled={gldtStakeButtonDisabled} fullWidth {onclick}>
						{replacePlaceholders($i18n.stake.text.stake, {
							$token_symbol: gldtTokenSymbol
						})}
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
