<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import {
		icrcTokens,
		icrcCustomTokensNotInitialized,
		icrcCustomTokensInitialized
	} from '$icp/derived/icrc.derived';
	import { loadCustomTokens } from '$icp/services/icrc.services';
	import type { IcToken } from '$icp/types/ic-token';
	import { setCustomToken } from '$icp-eth/services/custom-token.services';
	import { isGLDTToken } from '$icp-eth/utils/token.utils';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import StakeModal from '$lib/components/stake/StakeModal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonWithModal from '$lib/components/ui/ButtonWithModal.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { modalGldtStake } from '$lib/derived/modal.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { autoLoadSingleToken } from '$lib/services/token.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { formatCurrency, formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { calculateTokenUsdAmount, getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		gldtToken?: IcToken;
	}

	let { gldtToken }: Props = $props();

	let gldtTokenBalance = $derived(
		nonNullish(gldtToken) ? ($balancesStore?.[gldtToken?.id]?.data ?? ZERO) : ZERO
	);

	let gldtTokenSymbol = $derived(nonNullish(gldtToken) ? getTokenDisplaySymbol(gldtToken) : 'GLDT');

	let gldtTokenUsdBalance = $derived(
		nonNullish(gldtToken)
			? (calculateTokenUsdAmount({
					amount: gldtTokenBalance,
					token: gldtToken,
					$exchanges
				}) ?? 0)
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

		{#if nonNullish(gldtToken)}
			<div class="flex gap-2">
				<span class="font-bold">
					{formatCurrency({
						value: gldtTokenUsdBalance,
						currency: $currentCurrency,
						exchangeRate: $currencyExchangeStore,
						language: $currentLanguage
					})}
				</span>

				<span class="text-tertiary">
					{formatToken({
						value: gldtTokenBalance,
						unitName: gldtToken.decimals
					})}
					{gldtTokenSymbol}
				</span>
			</div>
		{:else if $icrcCustomTokensInitialized}
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
					<Button disabled={gldtTokenBalance === ZERO} fullWidth {onclick}>
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
