<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { getTokenFee } from '$icp/utils/token.utils';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import SwapToken from '$lib/components/swap/SwapToken.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		CYCLES_TOP_UP_REVIEW,
		CYCLES_TOP_UP_REVIEW_BACK_BUTTON,
		CYCLES_TOP_UP_REVIEW_TOP_UP_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		canisterId: string;
		sendAmount: OptionAmount;
		// The last top-up got no answer. `resend`: Review shows that top-up again, and Top up
		// resends it. `fresh`: the amount or canister changed, so Top up starts a new one.
		unknownOutcome?: 'resend' | 'fresh';
		onBack: () => void;
		onTopUp: () => void;
	}

	let { canisterId, sendAmount, unknownOutcome, onBack, onTopUp }: Props = $props();

	const { sourceToken, sourceTokenExchangeRate } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	let fee = $derived(getTokenFee($sourceToken) ?? ZERO);

	let total = $derived(
		nonNullish(sendAmount) && !invalidAmount(sendAmount)
			? formatToken({
					value: parseToken({ value: `${sendAmount}`, unitName: $sourceToken.decimals }) + fee,
					unitName: $sourceToken.decimals,
					displayDecimals: $sourceToken.decimals
				})
			: undefined
	);
</script>

<ContentWithToolbar testId={CYCLES_TOP_UP_REVIEW}>
	<div class="mb-6 rounded-lg border border-solid border-tertiary bg-primary p-4 shadow-sm">
		<SwapToken amount={sendAmount} exchangeRate={$sourceTokenExchangeRate} token={$sourceToken}>
			{#snippet title()}{$i18n.cycles_top_up.text.you_top_up}{/snippet}
		</SwapToken>
	</div>

	<!-- In full, never shortened: cycles sent to the wrong canister are gone. -->
	<ModalValue>
		{#snippet label()}{$i18n.cycles_top_up.text.canister}{/snippet}
		{#snippet mainValue()}<output class="break-all">{canisterId}</output>{/snippet}
	</ModalValue>

	<FeeDisplay
		decimals={$sourceToken.decimals}
		exchangeRate={$sourceTokenExchangeRate}
		feeAmount={fee}
		symbol={$sourceToken.symbol}
	>
		{#snippet label()}{$i18n.fee.text.network_fee}{/snippet}
	</FeeDisplay>

	{#if nonNullish(total)}
		<ModalValue>
			{#snippet label()}{$i18n.cycles_top_up.text.total}{/snippet}
			{#snippet mainValue()}{total} {$sourceToken.symbol}{/snippet}
		</ModalValue>
	{/if}

	{#if nonNullish(unknownOutcome)}
		<div class="mt-4" in:fade>
			<MessageBox level="warning">
				{replacePlaceholders(
					unknownOutcome === 'resend'
						? $i18n.cycles_top_up.text.unknown
						: $i18n.cycles_top_up.text.unknown_fresh,
					{ $token: $sourceToken.symbol }
				)}
			</MessageBox>
		</div>
	{/if}

	<div class="mt-4">
		<MessageBox level="info">{$i18n.cycles_top_up.text.one_way}</MessageBox>
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onBack} testId={CYCLES_TOP_UP_REVIEW_BACK_BUTTON} />

			<Button
				disabled={invalidAmount(sendAmount)}
				onclick={onTopUp}
				testId={CYCLES_TOP_UP_REVIEW_TOP_UP_BUTTON}
			>
				{$i18n.cycles_top_up.text.top_up}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
