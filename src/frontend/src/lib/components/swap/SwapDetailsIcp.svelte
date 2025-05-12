<script lang="ts">
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';

	const { provider } = $props<{
		provider: Extract<SwapMappedResult, { provider: SwapProvider.ICP_SWAP }>;
	}>();
	const { destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const calculateMinimum = (
		receiveOutMinimum: bigint,
		destinationToken: IcTokenToggleable | undefined
	) => {
		if (nonNullish(receiveOutMinimum) && nonNullish(destinationToken)) {
			return `${formatTokenBigintToNumber({
				value: receiveOutMinimum,
				unitName: destinationToken.decimals,
				displayDecimals: destinationToken.decimals
			})} ${destinationToken.symbol}`;
		}
		return null;
	};

	const formattedMinimum = $derived(
		calculateMinimum(provider.receiveOutMinimum, $destinationToken)
	);
</script>

{#if nonNullish(formattedMinimum)}
	<ModalValue>
		<svelte:fragment slot="label">{$i18n.swap.text.expected_minimum}</svelte:fragment>
		<svelte:fragment slot="main-value">{formattedMinimum}</svelte:fragment>
	</ModalValue>
{/if}
