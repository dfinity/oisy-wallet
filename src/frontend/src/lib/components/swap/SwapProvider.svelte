<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import SwapProviderDetails from '$lib/components/swap/SwapProviderDetails.svelte';
	import BestRateBadge from '$lib/components/ui/BestRateBadge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import CollapsibleBottomSheet from '$lib/components/ui/CollapsibleBottomSheet.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import type { OptionAmount } from '$lib/types/send';
	import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';
	import { findSwapProvider } from '$lib/utils/swap.utils';
	import { fly, slide } from '$lib/utils/transitions.utils';

	interface Props {
		slippageValue: OptionAmount;
	}

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let { slippageValue }: Props = $props();

	let selectedProvider = $derived($swapAmountsStore?.selectedProvider);
	let isBestRate = $derived(selectedProvider?.provider === $swapAmountsStore?.swaps[0]?.provider);
	let swapDApp = $derived(
		nonNullish(selectedProvider?.provider) ? findSwapProvider(selectedProvider.provider) : null
	);
</script>

{#if nonNullish(swapDApp) && nonNullish(selectedProvider)}
	<!-- The row opens and closes with its height, so what is below moves instead of jumping. -->
	<div transition:slide>
		<div transition:fly={{ y: 4 }}>
			<CollapsibleBottomSheet showContentHeader>
				{#snippet contentHeader()}
					<ModalValue>
						{#snippet label()}
							<div class="flex justify-center gap-2">
								{$i18n.swap.text.swap_provider}
							</div>
						{/snippet}

						{#snippet mainValue()}
							<div class="flex items-start gap-3">
								{#if isBestRate}
									<BestRateBadge />
								{/if}
								<div class="flex gap-2">
									<div class="mt-1">
										<Logo
											alt={replacePlaceholders($i18n.dapps.alt.logo, {
												$dAppName: resolveText({ i18n: $i18n, path: swapDApp.name })
											})}
											src={swapDApp.logo}
										/>
									</div>
									<div class="mr-auto">
										<div class="text-lg font-bold"
											>{resolveText({ i18n: $i18n, path: swapDApp.name })}</div
										>
									</div>
								</div>
							</div>
						{/snippet}
					</ModalValue>
				{/snippet}
				{#snippet content()}
					<SwapProviderDetails provider={selectedProvider} {slippageValue} />
				{/snippet}
				{#snippet contentFooter(closeFn)}
					<Button fullWidth onclick={closeFn}>{$i18n.core.text.done}</Button>
				{/snippet}
			</CollapsibleBottomSheet>
		</div>
	</div>
{/if}
