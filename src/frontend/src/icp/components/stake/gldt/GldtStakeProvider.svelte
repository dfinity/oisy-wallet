<script lang="ts">
	import { getContext } from 'svelte';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import IconLineChart from '$lib/components/icons/lucide/IconLineChart.svelte';
	import StakeProvider from '$lib/components/stake/StakeProvider.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { StakeProvider as StakeProviderType } from '$lib/types/stake';
	import { formatStakeApyNumber } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	const { sendTokenSymbol } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const { store: gldtStakeApyStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);
</script>

<StakeProvider provider={StakeProviderType.GLDT}>
	{#snippet content()}
		<div class="flex">
			<IconLineChart />

			<div class="ml-3 w-full text-sm">
				<div class="mb-1 font-bold">
					{replacePlaceholders($i18n.stake.text.current_apy, {
						$apy: formatStakeApyNumber($gldtStakeApyStore?.apy ?? 0)
					})}
				</div>

				<div class="text-tertiary">
					{replacePlaceholders($i18n.stake.text.current_apy_info, { $token: $sendTokenSymbol })}
				</div>
			</div>
		</div>
	{/snippet}
</StakeProvider>
