<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import CyclesMintDetails from '$icp/components/cycles-mint/CyclesMintDetails.svelte';
	import { estimateCyclesMintCredited } from '$icp/utils/cycles-mint.utils';
	import IconCircleArrowDown from '$lib/components/icons/lucide/IconCircleArrowDown.svelte';
	import SwapToken from '$lib/components/swap/SwapToken.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import {
		CYCLES_MINT_REVIEW,
		CYCLES_MINT_REVIEW_MINT_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		sendAmount: OptionAmount;
		xdrPermyriadPerIcp?: bigint;
		onBack: () => void;
		onMint: () => void;
	}

	let { sendAmount, xdrPermyriadPerIcp, onBack, onMint }: Props = $props();

	const { sourceToken, destinationToken, sourceTokenExchangeRate, destinationTokenExchangeRate } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	let estimateAmount = $derived(
		nonNullish(sendAmount) && !invalidAmount(sendAmount) && nonNullish(xdrPermyriadPerIcp)
			? formatToken({
					value: estimateCyclesMintCredited({
						amount: parseToken({ value: `${sendAmount}`, unitName: $sourceToken.decimals }),
						xdrPermyriadPerIcp
					}),
					unitName: $destinationToken.decimals,
					displayDecimals: $destinationToken.decimals
				})
			: undefined
	);
</script>

<ContentWithToolbar testId={CYCLES_MINT_REVIEW}>
	<div class="mb-6 rounded-lg border border-solid border-tertiary bg-primary p-4 shadow-sm">
		<SwapToken amount={sendAmount} exchangeRate={$sourceTokenExchangeRate} token={$sourceToken}>
			{#snippet title()}{$i18n.tokens.text.source_token_title}{/snippet}
		</SwapToken>

		<div class="my-2 flex w-full items-center justify-between text-tertiary-inverted">
			<div class="h-[1px] w-[45%] bg-tertiary"></div>
			<IconCircleArrowDown />
			<div class="h-[1px] w-[45%] bg-tertiary"></div>
		</div>

		<SwapToken
			amount={estimateAmount}
			exchangeRate={$destinationTokenExchangeRate}
			token={$destinationToken}
		>
			{#snippet title()}{$i18n.cycles_mint.text.you_mint_estimate}{/snippet}
		</SwapToken>
	</div>

	<CyclesMintDetails showMinter {xdrPermyriadPerIcp} />

	<div class="mt-4">
		<MessageBox level="info">
			{replacePlaceholders($i18n.cycles_mint.text.one_way, {
				$sourceToken: $sourceToken.symbol,
				$destinationToken: $destinationToken.symbol
			})}
		</MessageBox>
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onBack} />

			<Button
				disabled={invalidAmount(sendAmount) || isNullish(xdrPermyriadPerIcp)}
				onclick={onMint}
				testId={CYCLES_MINT_REVIEW_MINT_BUTTON}
			>
				{$i18n.mint.text.mint}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
