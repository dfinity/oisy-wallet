<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconOpenCryptoPay from '$lib/components/icons/IconOpenCryptoPay.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Amount } from '$lib/types/send';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		amount: Amount;
		asset: string;
		receipt?: string;
	}

	let { amount, asset, receipt }: Props = $props();
</script>

<div
	class="bg-pos-0 bg-brand-subtle-10 text-primary-inverted mb-6 flex h-full w-full flex-col content-center items-center justify-center rounded-[24px] pt-6 text-center md:rounded-[28px]"
>
	{#if nonNullish(receipt)}
		<p class="text-secondary mb-3 font-bold">
			{replacePlaceholders($i18n.scanner.text.pay_to, {
				$receipt: receipt
			})}
		</p>
	{/if}

	<div class="text-secondary mb-6 flex flex-col gap-1">
		<output
			class="inline-flex w-full flex-row justify-center gap-3 text-4xl font-bold break-words md:text-5xl"
		>
			<data value={amount}>
				{amount}
			</data>
			{asset}
		</output>
	</div>
	<div
		class="bg-brand-subtle-20 text-secondary flex w-full items-center justify-center rounded-b-[24px] p-1"
	>
		<p class="m-2 text-xs font-normal">{$i18n.scanner.text.powered_by}</p><IconOpenCryptoPay /></div
	>
</div>
