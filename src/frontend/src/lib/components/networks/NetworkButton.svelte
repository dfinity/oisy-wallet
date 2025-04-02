<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LabelSize } from '$lib/types/components';
	import type { NetworkId } from '$lib/types/network';
	import { formatUSD } from '$lib/utils/format.utils';

	export let id: NetworkId | undefined;
	export let selectedNetworkId: NetworkId | undefined = undefined;
	export let name: string;
	export let icon: string | undefined;
	export let usdBalance: number | undefined = undefined;
	export let isTestnet = false;
	export let testId: string | undefined = undefined;
	export let delayOnNetworkSelect = true;
	export let labelsSize: LabelSize = 'md';

	const dispatch = createEventDispatcher();

	const onIcSelected = () => dispatch('icSelected', id);

	const onClick = () => {
		// If rendered in the dropdown, we add a small delay to give the user a visual feedback that the network is checked
		delayOnNetworkSelect ? setTimeout(onIcSelected, 500) : onIcSelected();
	};
</script>

<LogoButton {testId} on:click={onClick} selectable selected={id === selectedNetworkId} dividers>
	<Logo slot="logo" src={icon} />

	<span
		slot="title"
		class="mr-2 font-normal md:text-base"
		class:text-sm={labelsSize === 'md'}
		class:md:text-base={labelsSize === 'md'}
		class:text-base={labelsSize === 'lg'}
		class:md:text-lg={labelsSize === 'lg'}
	>
		{name}
	</span>

	<span slot="description-end">
		<span class:text-sm={labelsSize === 'lg'} class:md:text-base={labelsSize === 'lg'}>
			{#if nonNullish(usdBalance)}
				{formatUSD({ value: usdBalance })}
			{/if}
		</span>

		{#if isTestnet}
			<span class="inline-flex">
				<Badge styleClass="pt-0 pb-0">{$i18n.networks.testnet}</Badge>
			</span>
		{/if}
	</span>
</LogoButton>
