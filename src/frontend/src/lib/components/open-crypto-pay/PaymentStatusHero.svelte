<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IconOpenCryptoPay from '$lib/components/icons/IconOpenCryptoPay.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		status: 'success' | 'failure';
	}

	let { status }: Props = $props();

	const { selectedToken, data } = getContext<PayContext>(PAY_CONTEXT_KEY);
</script>

{#if nonNullish($selectedToken) && nonNullish($data?.displayName)}
	<div
		class="bg-pos-0 text-primary-inverted mb-6 flex w-full flex-col content-center items-center overflow-hidden rounded-[24px] pt-6 text-center md:rounded-[28px]"
		class:bg-error-subtle-20={status === 'failure'}
		class:bg-success-subtle-20={status === 'success'}
	>
		<div>
			<TokenLogo badge={{ type: 'network' }} data={$selectedToken} />
		</div>
		<p class="text-md text-secondary mt-3 mb-2 font-bold">
			{#if status === 'success'}
				{replacePlaceholders($i18n.scanner.text.pay_at_successful, {
					$receipt: $data.displayName
				})}
			{:else if status === 'failure'}
				{replacePlaceholders($i18n.scanner.text.pay_at_failure, {
					$receipt: $data.displayName
				})}
			{/if}
		</p>

		<div class="text-secondary mb-6 flex flex-col gap-1">
			<output
				class="inline-flex w-full flex-row justify-center gap-3 text-xl font-bold break-words"
			>
				<data value={$selectedToken.amount}>
					{$selectedToken.amount}
				</data>
				{$selectedToken.symbol}
			</output>
		</div>
		<div
			class="text-secondary flex w-full items-center justify-center p-1"
			class:bg-brand-subtle-10={status === 'success'}
			class:bg-error-subtle-20={status === 'failure'}
		>
			<p class="m-2 text-xs font-normal">{$i18n.scanner.text.powered_by}</p><IconOpenCryptoPay />
		</div>
	</div>
{/if}
