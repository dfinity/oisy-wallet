<script lang="ts">
	import IconOpenCryptoPay from '$lib/components/icons/IconOpenCryptoPay.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		amount: string | number;
		asset: string;
		receipt: string;
	}

	let { amount, asset, receipt }: Props = $props();
</script>

<div
	class="bg-pos-0 mb-6 flex h-full w-full flex-col content-center items-center justify-center rounded-[24px] bg-brand-subtle-10 pt-6 text-center text-primary-inverted transition-all duration-500 ease-in-out md:rounded-[28px]"
>
	<p class="mb-3 font-bold text-secondary">
		{replacePlaceholders($i18n.scanner.text.pay_to, {
			$receipt: receipt
		})}
	</p>
	<div class="mb-6 flex flex-col gap-1 text-secondary">
		<output
			class="inline-flex w-full flex-row justify-center gap-3 text-4xl font-bold break-words md:text-5xl"
		>
			<data value={amount}>
				{amount}
			</data>
			{asset}
		</output>
	</div>
	<div class="w-full rounded-b-[24px] bg-brand-subtle-20">
		<p class="m-2 flex items-center justify-center gap-2 p-1 text-xs font-normal text-secondary"
			>{$i18n.scanner.text.powered_by} <IconOpenCryptoPay /></p
		></div
	>
</div>
