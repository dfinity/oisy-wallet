<script lang="ts">
	import { type Component, getContext } from 'svelte';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import IconLineChart from '$lib/components/icons/lucide/IconLineChart.svelte';
	import StakeProvider from '$lib/components/stake/StakeProvider.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { StakeProvider as StakeProviderType } from '$lib/types/stake';
	import { formatStakeApyNumber } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { readable } from 'svelte/store';

	//const { sendTokenSymbol } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const sendTokenSymbol = readable('gldt');

	const { store: gldtStakeApyStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	const data: { icon: Component; title: string; description?: string }[] = [
		{
			icon: IconLineChart,
			title: replacePlaceholders($i18n.stake.text.current_apy, {
				$apy: formatStakeApyNumber($gldtStakeApyStore?.apy ?? 0)
			}),
			description: replacePlaceholders($i18n.stake.text.current_apy_info, {
				$token: $sendTokenSymbol
			})
		},
		{
			icon: IconLineChart,
			title: replacePlaceholders($i18n.stake.text.current_apy, {
				$apy: formatStakeApyNumber($gldtStakeApyStore?.apy ?? 0)
			}),
			description: replacePlaceholders($i18n.stake.text.current_apy_info, {
				$token: $sendTokenSymbol
			})
		},
		{
			icon: IconLineChart,
			title: replacePlaceholders($i18n.stake.text.current_apy, {
				$apy: formatStakeApyNumber($gldtStakeApyStore?.apy ?? 0)
			})
		}
	];
</script>

<StakeProvider provider={StakeProviderType.GLDT} {data} />
