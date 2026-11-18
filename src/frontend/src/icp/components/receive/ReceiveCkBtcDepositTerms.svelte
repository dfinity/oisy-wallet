<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BTC_DECIMALS } from '$env/tokens/tokens.btc.env';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { initCkBTCMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import Button from '$lib/components/ui/Button.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { RECEIVE_CKBTC_TERMS_RETRY_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';

	interface Props {
		// The ckBTC the deposit credits: its minter sets the terms.
		token: Token;
		sourceToken: Token;
	}

	let { token, sourceToken }: Props = $props();

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

<div class="mt-4 flex flex-col gap-1" aria-live="polite">
	<ModalValue>
		{#snippet label()}{$i18n.receive.ckbtc.text.confirmations}{/snippet}
		{#snippet mainValue()}
			{#if nonNullish(minterInfo)}
				{minterInfo.data.min_confirmations}
			{:else if failed}
				{$i18n.receive.ckbtc.text.unavailable}
			{:else}
				<span class="block w-12"><SkeletonText /></span>
			{/if}
		{/snippet}
	</ModalValue>

	<ModalValue>
		{#snippet label()}{$i18n.receive.ckbtc.text.estimated_fee}{/snippet}
		{#snippet mainValue()}
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
		{/snippet}
	</ModalValue>

	<p class="text-sm text-tertiary">{$i18n.receive.ckbtc.text.small_deposit}</p>

	{#if failed}
		<div class="flex items-center justify-between gap-2">
			<p class="text-sm text-error-primary">{$i18n.receive.ckbtc.text.terms_error}</p>
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
</div>
