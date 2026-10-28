<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import CyclesTopUpIcpDetails from '$icp/components/cycles-top-up/CyclesTopUpIcpDetails.svelte';
	import { CMC_NAME } from '$icp/constants/cmc.constants';
	import { getTokenFee } from '$icp/utils/token.utils';
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
		xdrPermyriadPerIcp?: bigint;
		// The re-quote Review opened with is still on its way: Top up waits for it, as Mint does.
		requoting?: boolean;
		onBack: () => void;
		onTopUp: () => void;
	}

	let {
		canisterId,
		sendAmount,
		xdrPermyriadPerIcp,
		requoting = false,
		onBack,
		onTopUp
	}: Props = $props();

	const { sourceToken, sourceTokenExchangeRate } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	let fee = $derived(getTokenFee($sourceToken) ?? ZERO);

	let amount = $derived(
		nonNullish(sendAmount) && !invalidAmount(sendAmount)
			? parseToken({ value: `${sendAmount}`, unitName: $sourceToken.decimals })
			: undefined
	);

	let total = $derived(
		nonNullish(amount)
			? formatToken({
					value: amount + fee,
					unitName: $sourceToken.decimals,
					displayDecimals: $sourceToken.decimals
				})
			: undefined
	);
</script>

<ContentWithToolbar testId={CYCLES_TOP_UP_REVIEW}>
	<div class="mb-6 rounded-lg border border-solid border-tertiary bg-primary p-4 shadow-sm">
		<SwapToken amount={sendAmount} exchangeRate={$sourceTokenExchangeRate} token={$sourceToken}>
			{#snippet title()}{$i18n.tokens.text.source_token_title}{/snippet}
		</SwapToken>
	</div>

	<!-- In full, never shortened: cycles sent to the wrong canister are gone. -->
	<ModalValue>
		{#snippet label()}{$i18n.cycles_top_up.text.canister}{/snippet}
		{#snippet mainValue()}<output class="break-all">{canisterId}</output>{/snippet}
	</ModalValue>

	<CyclesTopUpIcpDetails {amount} {xdrPermyriadPerIcp} />

	{#if nonNullish(total)}
		<ModalValue>
			{#snippet label()}{$i18n.cycles_top_up.text.total}{/snippet}
			{#snippet mainValue()}{total} {$sourceToken.symbol}{/snippet}
		</ModalValue>
	{/if}

	<ModalValue>
		{#snippet label()}{$i18n.cycles_top_up.text.converted_by}{/snippet}
		{#snippet mainValue()}{CMC_NAME}{/snippet}
	</ModalValue>

	<div class="mt-4">
		<MessageBox level="info">
			{replacePlaceholders($i18n.cycles_top_up.text.one_way_icp, { $token: $sourceToken.symbol })}
		</MessageBox>
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onBack} testId={CYCLES_TOP_UP_REVIEW_BACK_BUTTON} />

			<Button
				disabled={requoting || invalidAmount(sendAmount) || isNullish(xdrPermyriadPerIcp)}
				onclick={onTopUp}
				testId={CYCLES_TOP_UP_REVIEW_TOP_UP_BUTTON}
			>
				{$i18n.cycles_top_up.text.top_up}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
