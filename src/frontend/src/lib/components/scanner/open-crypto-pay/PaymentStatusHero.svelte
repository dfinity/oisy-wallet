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
		class="bg-pos-0 mb-6 flex h-full w-full flex-col content-center items-center justify-center rounded-[24px] pt-6 text-center text-primary-inverted md:rounded-[28px]"
		class:bg-error-subtle-20={status === 'failure'}
		class:bg-success-subtle-20={status === 'success'}
	>
		<div>
			<TokenLogo badge={{ type: 'network' }} data={$selectedToken} />
		</div>
		<p class="text-md mt-3 mb-2 font-bold text-secondary">
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

		<div class="mb-6 flex flex-col gap-1 text-secondary">
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
			class="flex w-full items-center justify-center rounded-b-[24px] p-1 text-secondary"
			class:bg-brand-subtle-10={status === 'success'}
			class:bg-error-subtle-20={status === 'failure'}
		>
			<p class="m-2 text-xs font-normal">{$i18n.scanner.text.powered_by}</p><IconOpenCryptoPay />
		</div>
	</div>
{/if}
