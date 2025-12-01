<script lang="ts">
	import { getContext } from 'svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { formatCurrency } from '$lib/utils/format.utils';

	interface Props {
		amount: number;
		label: string;
		isTitle?: boolean;
		styleClass?: string;
	}

	let { amount, label, isTitle = false, styleClass }: Props = $props();

	const { sendTokenExchangeRate, sendTokenSymbol } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<span class={`flex w-full items-center justify-between ${styleClass ?? ''}`}>
	<span
		class:font-bold={isTitle}
		class:text-sm={isTitle}
		class:text-tertiary={!isTitle}
		class:text-xs={!isTitle}
	>
		{label}
	</span>

	<span class="flex items-center gap-2">
		<span
			class="text-sm"
			class:font-bold={isTitle}
			class:text-sm={isTitle}
			class:text-xs={!isTitle}
		>
			{amount}
			{$sendTokenSymbol}
		</span>

		<span class="text-xs text-tertiary">
			{formatCurrency({
				value: amount * ($sendTokenExchangeRate ?? 0),
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage
			})}
		</span>
	</span>
</span>
