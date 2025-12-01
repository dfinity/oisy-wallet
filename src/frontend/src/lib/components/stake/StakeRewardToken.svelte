<script lang="ts">
	import { stopPropagation } from '@dfinity/gix-components';
	import Divider from '$lib/components/common/Divider.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import { formatCurrency, formatToken } from '$lib/utils/format.utils';
	import { calculateTokenUsdAmount, getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token: Token;
		amount: bigint;
	}

	let { token, amount }: Props = $props();

	let disabled = $derived(amount === ZERO);

	let formattedAmount = $derived(
		formatToken({
			value: amount,
			unitName: token.decimals
		})
	);

	const onClick = () => {
		modalStore.openGldtClaimStakingReward({
			id: Symbol(),
			data: {
				token,
				rewardAmount: formattedAmount
			}
		});
	};
</script>

<LogoButton hover={false}>
	{#snippet logo()}
		<span class="flex sm:mr-2">
			<Responsive up="md">
				<TokenLogo badge={{ type: 'network' }} color="white" data={token} />
			</Responsive>
			<Responsive down="sm">
				<TokenLogo badge={{ type: 'network' }} color="white" data={token} logoSize="xs" />
			</Responsive>
		</span>
	{/snippet}

	{#snippet title()}
		<span class="text-sm">
			{getTokenDisplaySymbol(token)}

			<span class="hidden font-normal text-tertiary sm:inline-block">
				<Divider />{token.name}
			</span>
		</span>
	{/snippet}

	{#snippet titleEnd()}
		{formattedAmount}
	{/snippet}

	{#snippet description()}
		{token.network.name}
	{/snippet}

	{#snippet descriptionEnd()}
		{formatCurrency({
			value:
				calculateTokenUsdAmount({
					amount,
					token,
					$exchanges
				}) ?? 0,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage,
			notBelowThreshold: !disabled
		})}
	{/snippet}

	{#snippet action()}
		<Button
			colorStyle="success"
			{disabled}
			onclick={stopPropagation(onClick)}
			paddingSmall
			styleClass="sm:ml-8 ml-2 sm:text-base text-sm"
		>
			<Responsive up="md">
				{$i18n.stake.text.claim_reward}
			</Responsive>
			<Responsive down="sm">
				{$i18n.stake.text.claim_reward_short}
			</Responsive>
		</Button>
	{/snippet}
</LogoButton>
