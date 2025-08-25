<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { SWAP_FEE_INFO } from '$lib/constants/test-ids.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionString } from '$lib/types/string';
	import type { OptionTokenId } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		decimals?: number;
		feeTokenId?: OptionTokenId;
		feeSymbol?: OptionString;
	}
	let { decimals, feeSymbol, feeTokenId }: Props = $props();
	const { sourceToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);
	const balanceForFee = nonNullish(feeTokenId)
		? ($balancesStore?.[feeTokenId]?.data ?? ZERO)
		: ZERO;
</script>

{#if nonNullish(feeSymbol) && $sourceToken?.symbol !== feeSymbol}
	<MessageBox styleClass="sm:text-sm" testId={SWAP_FEE_INFO}>
		<Html
			text={replacePlaceholders($i18n.send.info.fee_info, {
				$feeSymbol: feeSymbol,
				$feeBalance: formatToken({
					value: balanceForFee,
					displayDecimals: decimals,
					unitName: decimals
				})
			})}
		/>
	</MessageBox>
{/if}
