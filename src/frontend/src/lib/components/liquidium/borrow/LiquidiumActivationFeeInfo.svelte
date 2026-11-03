<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LiquidiumMarket } from '$lib/types/liquidium';
	import { formatStakeApyNumber } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		market: LiquidiumMarket;
	}

	let { market }: Props = $props();

	let activationFeePercent = $derived(market.activationFeePercent);
</script>

{#if nonNullish(activationFeePercent) && activationFeePercent > 0}
	<MessageBox level="info" styleClass="my-5" testId="liquidium-activation-fee-info">
		{replacePlaceholders($i18n.liquidium.text.borrow_activation_fee_info, {
			$fee: formatStakeApyNumber(activationFeePercent)
		})}
	</MessageBox>
{/if}
