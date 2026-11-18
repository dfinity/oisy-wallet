<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BTC_DECIMALS } from '$env/tokens/tokens.btc.env';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { initCkBTCMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import Button from '$lib/components/ui/Button.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import {
		RECEIVE_CKBTC_TERMS_RETRY_BUTTON,
		RECEIVE_CKBTC_VIEW_ACTIVITY_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';

	interface Props {
		// The ckBTC the deposit credits: its minter sets the terms.
		token: Token;
		sourceToken: Token;
		// Shown once the deposit address is: opens the ckBTC activity, where the deposit will show.
		onViewActivity?: () => void;
	}

	let { token, sourceToken, onViewActivity }: Props = $props();

	let minterInfo = $derived($ckBtcMinterInfoStore?.[token.id]);

	// `undefined` is still loading; `null` is a load that failed.
	let failed = $derived(minterInfo === null);

	let loaded = $derived(nonNullish(minterInfo) && minterInfo.certified);

	// Remounting the listener starts the minter info worker again.
	let attempt = $state(0);

	// Dropping the failed entry shows the terms as loading again until the new answer.
	const retry = () => {
		ckBtcMinterInfoStore.update((state) => {
			if (isNullish(state)) {
				return state;
			}

			const { [token.id]: _, ...rest } = state;
			return rest;
		});

		attempt++;
	};
</script>

{#key attempt}
	{#if !loaded}
		<IcCkListener initFn={initCkBTCMinterInfoWorker} {token} twinToken={sourceToken} />
	{/if}
{/key}

<!-- The deposit's terms as one compact card: two figures, one note, and the way to follow it. -->
<div class="mt-4 rounded-xl border border-secondary px-4 py-3 text-sm" aria-live="polite">
	<dl class="flex flex-col gap-2">
		<div class="flex items-center justify-between gap-4">
			<dt class="text-tertiary">{$i18n.receive.ckbtc.text.confirmations}</dt>
			<dd class="font-semibold text-primary">
				{#if nonNullish(minterInfo)}
					{minterInfo.data.min_confirmations}
				{:else if failed}
					{$i18n.receive.ckbtc.text.unavailable}
				{:else}
					<span class="block w-8"><SkeletonText /></span>
				{/if}
			</dd>
		</div>

		<div class="flex items-center justify-between gap-4">
			<dt class="text-tertiary">{$i18n.receive.ckbtc.text.estimated_fee}</dt>
			<dd class="font-semibold text-primary">
				{#if nonNullish(minterInfo)}
					{formatToken({
						value: minterInfo.data.kyt_fee,
						unitName: BTC_DECIMALS,
						displayDecimals: BTC_DECIMALS
					})}
					{sourceToken.symbol}
				{:else if failed}
					{$i18n.receive.ckbtc.text.unavailable}
				{:else}
					<span class="block w-20"><SkeletonText /></span>
				{/if}
			</dd>
		</div>
	</dl>

	<div class="mt-2 text-tertiary">{$i18n.receive.ckbtc.text.credit_note}</div>

	{#if failed}
		<div class="mt-2 flex items-center justify-between gap-2">
			<div class="text-error-primary">{$i18n.receive.ckbtc.text.terms_error}</div>
			<Button
				colorStyle="secondary-light"
				onclick={retry}
				paddingSmall
				testId={RECEIVE_CKBTC_TERMS_RETRY_BUTTON}
			>
				{$i18n.core.text.retry}
			</Button>
		</div>
	{/if}

	{#if onViewActivity}
		<div class="mt-2">
			<Button
				colorStyle="secondary-light"
				inlineLink
				link
				onclick={onViewActivity}
				testId={RECEIVE_CKBTC_VIEW_ACTIVITY_BUTTON}
			>
				{$i18n.receive.ckbtc.text.view_activity}
			</Button>
		</div>
	{/if}
</div>
