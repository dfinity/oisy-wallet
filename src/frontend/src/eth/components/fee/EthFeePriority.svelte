<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import EthFeePriorityOption from '$eth/components/fee/EthFeePriorityOption.svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import { estimatedGasFee } from '$eth/utils/fee.utils';
	import IconExpandMore from '$lib/components/icons/IconExpandMore.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import CollapsibleBottomSheet from '$lib/components/ui/CollapsibleBottomSheet.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import {
		ETH_FEE_PRIORITY,
		ETH_FEE_PRIORITY_OPTION,
		ETH_FEE_PRIORITY_TRIGGER
	} from '$lib/constants/test-ids.constants';
	import { EthFeePriority } from '$lib/enums/eth-fee-priority';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

	const { sendEthFeePriority } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const {
		feeStore,
		feePrioritiesStore,
		feeSymbolStore,
		feeDecimalsStore,
		feeExchangeRateStore
	}: EthFeeContext = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	const options = $derived([
		{
			priority: EthFeePriority.SLOW,
			name: $i18n.fee.text.priority_slow,
			description: $i18n.fee.text.priority_slow_description,
			emoji: '🐢'
		},
		{
			priority: EthFeePriority.NORMAL,
			name: $i18n.fee.text.priority_normal,
			description: $i18n.fee.text.priority_normal_description,
			emoji: '⚡'
		},
		{
			priority: EthFeePriority.FAST,
			name: $i18n.fee.text.priority_fast,
			description: $i18n.fee.text.priority_fast_description,
			emoji: '🔥'
		}
	]);

	const selectedName = $derived(
		options.find(({ priority }) => priority === $sendEthFeePriority)?.name
	);

	const feeFor = (priority: EthFeePriority): bigint | undefined => {
		if (isNullish($feePrioritiesStore) || isNullish($feeStore)) {
			return undefined;
		}

		const { baseFeePerGas, perPriority } = $feePrioritiesStore;

		return estimatedGasFee({
			...perPriority[priority],
			baseFeePerGas,
			gas: $feeStore.gas
		});
	};

	const onSelect = (priority: EthFeePriority) => sendEthFeePriority.set(priority);
</script>

{#if nonNullish($feePrioritiesStore) && nonNullish($feeSymbolStore) && nonNullish($feeDecimalsStore)}
	<div class="mb-4" data-tid={ETH_FEE_PRIORITY}>
		<CollapsibleBottomSheet sheetTitle={$i18n.fee.text.priority}>
			{#snippet contentHeader()}
				<span class="flex min-w-0 flex-1 items-center justify-between gap-2">
					<span class="text-sm text-tertiary">{$i18n.fee.text.priority}</span>

					<Responsive up="md">
						<span class="text-sm font-bold text-primary">{selectedName}</span>
					</Responsive>
				</span>
			{/snippet}

			{#snippet trigger({ open })}
				<span class="ml-auto">
					<Button link onclick={open} testId={ETH_FEE_PRIORITY_TRIGGER} type="button">
						<span class="flex items-center gap-1">
							{selectedName}
							<IconExpandMore />
						</span>
					</Button>
				</span>
			{/snippet}

			{#snippet content()}
				<div class="flex w-full flex-col">
					{#each options as { priority, name, description, emoji } (priority)}
						<EthFeePriorityOption
							{name}
							decimals={$feeDecimalsStore}
							{description}
							{emoji}
							exchangeRate={$feeExchangeRateStore}
							fee={feeFor(priority)}
							groupName={ETH_FEE_PRIORITY}
							{onSelect}
							{priority}
							selected={priority === $sendEthFeePriority}
							symbol={$feeSymbolStore}
							testId={`${ETH_FEE_PRIORITY_OPTION}-${priority}`}
						/>
					{/each}
				</div>
			{/snippet}

			{#snippet contentFooter(closeFn)}
				<Button fullWidth onclick={closeFn} type="button">{$i18n.core.text.done}</Button>
			{/snippet}
		</CollapsibleBottomSheet>
	</div>
{/if}
