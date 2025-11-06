<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import type { IcToken } from '$icp/types/ic-token';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import UnstakeModal from '$lib/components/stake/UnstakeModal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonWithModal from '$lib/components/ui/ButtonWithModal.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { modalGldtUnstake } from '$lib/derived/modal.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { calculateTokenUsdAmount } from '$lib/utils/token.utils';

	interface Props {
		gldtToken?: IcToken;
	}

	let { gldtToken }: Props = $props();

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	let stakedAmountUsd = $derived(
		nonNullish(gldtToken)
			? (calculateTokenUsdAmount({
					amount: $gldtStakeStore?.position?.staked ?? ZERO,
					token: gldtToken,
					$exchanges
				}) ?? 0)
			: 0
	);

	let currentApy = $derived($gldtStakeStore?.apy ?? 0);
</script>

<StakeContentCard>
	{#snippet content()}
		<div class="text-sm">{$i18n.stake.text.active_earning}</div>

		<div class="my-1 text-lg font-bold" class:text-success-primary={stakedAmountUsd > 0}>
			{replacePlaceholders($i18n.stake.text.active_earning_per_year, {
				$amount: `${formatCurrency({
					value: (stakedAmountUsd * currentApy) / 100,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})}`
			})}
		</div>

		<div class="text-sm font-bold">
			{formatCurrency({
				value: stakedAmountUsd,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage
			})}
		</div>
	{/snippet}

	{#snippet buttons()}
		{#if nonNullish(gldtToken)}
			<ButtonWithModal isOpen={$modalGldtUnstake} onOpen={modalStore.openGldtUnstake}>
				{#snippet button(onclick)}
					<Button disabled={stakedAmountUsd === 0} fullWidth {onclick}>
						{$i18n.stake.text.unstake}
					</Button>
				{/snippet}

				{#snippet modal()}
					<UnstakeModal token={gldtToken} totalStaked={$gldtStakeStore?.position?.staked} />
				{/snippet}
			</ButtonWithModal>
		{/if}
	{/snippet}
</StakeContentCard>
