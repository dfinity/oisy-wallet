<script lang="ts">
	import { getContext } from 'svelte';
	import GetTokenCardContent from '$lib/components/get-token/GetTokenCardContent.svelte';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import SwapLoader from '$lib/components/swap/SwapLoader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_HOW_TO_CONVERT_DOCS_URL } from '$lib/constants/oisy.constants';
	import { GET_TOKEN_MODAL_OPEN_SWAP_BUTTON } from '$lib/constants/test-ids.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import {
		enabledMainnetFungibleTokensUsdBalance,
		enabledMainnetFungibleIcTokensUsdBalance
	} from '$lib/derived/tokens.derived';
	import { WizardStepsGetToken } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { WizardStepsGetTokenType } from '$lib/types/get-token';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token: Token;
		currentApy: number;
		onGoToStep: (stepName: WizardStepsGetTokenType) => void;
		onClose: () => void;
	}

	const { setDestinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let { token, currentApy, onGoToStep, onClose }: Props = $props();

	let tokenSymbol = $derived(getTokenDisplaySymbol(token));

	let tokenExchangeRate = $derived($exchanges?.[token.id]?.usd ?? 0);

	let potentialTokenBalance = $derived(
		tokenExchangeRate > 0 && $enabledMainnetFungibleTokensUsdBalance > 0
			? Math.round($enabledMainnetFungibleTokensUsdBalance / tokenExchangeRate)
			: 0
	);

	const onSwapOpen = (onSwapLoad: (callback: () => void) => void) => {
		onSwapLoad(() => {
			setDestinationToken(token);
			onGoToStep(WizardStepsGetToken.SWAP);
		});
	};
</script>

<ContentWithToolbar>
	<div class="mb-2 text-base font-bold sm:text-lg">
		{replacePlaceholders(
			potentialTokenBalance <= 0
				? $i18n.stake.text.get_tokens
				: $i18n.stake.text.get_tokens_with_amount,
			{
				$token_symbol: tokenSymbol,
				$amount: `${potentialTokenBalance}`
			}
		)}
	</div>

	<div class="flex flex-col justify-between gap-4 sm:flex-row">
		<StakeContentCard primaryStyle>
			{#snippet content()}
				<GetTokenCardContent
					{currentApy}
					potentialTokensUsdBalance={$enabledMainnetFungibleIcTokensUsdBalance}
					{token}
				>
					{#snippet title()}
						{replacePlaceholders($i18n.get_token.text.swap_to_token, { $token: tokenSymbol })}
					{/snippet}

					{#snippet label()}
						{$i18n.get_token.text.convert_assets}:
					{/snippet}
				</GetTokenCardContent>
			{/snippet}

			{#snippet buttons()}
				<SwapLoader>
					{#snippet button(onSwapLoad)}
						<Button
							onclick={() => onSwapOpen(onSwapLoad)}
							testId={GET_TOKEN_MODAL_OPEN_SWAP_BUTTON}
						>
							{replacePlaceholders($i18n.get_token.text.swap_to_token, { $token: tokenSymbol })}
						</Button>
					{/snippet}
				</SwapLoader>
			{/snippet}
		</StakeContentCard>

		<StakeContentCard primaryStyle>
			{#snippet content()}
				<GetTokenCardContent
					{currentApy}
					potentialTokensUsdBalance={$enabledMainnetFungibleTokensUsdBalance -
						$enabledMainnetFungibleIcTokensUsdBalance}
					{token}
				>
					{#snippet title()}
						{$i18n.get_token.text.convert_assets}
					{/snippet}

					{#snippet label()}
						{$i18n.get_token.text.convertible_assets}:
					{/snippet}
				</GetTokenCardContent>
			{/snippet}

			{#snippet buttons()}
				<ExternalLink
					ariaLabel={$i18n.get_token.text.how_to_convert}
					asButton
					fullWidth
					href={OISY_HOW_TO_CONVERT_DOCS_URL}
					iconAsLast
					styleClass="secondary-light"
				>
					{$i18n.get_token.text.how_to_convert}
				</ExternalLink>
			{/snippet}
		</StakeContentCard>
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel fullWidth={true} onclick={onClose} />
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
