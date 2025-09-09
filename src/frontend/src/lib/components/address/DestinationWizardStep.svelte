<script lang="ts">
	import { type Snippet, createEventDispatcher } from 'svelte';
	import { run } from 'svelte/legacy';
	import IcSendDestination from '$icp/components/send/IcSendDestination.svelte';
	import DestinationWizardStepSection from '$lib/components/address/DestinationWizardStepSection.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import type { TokenStandard } from '$lib/types/token';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		tokenStandard: TokenStandard;
		customDestination?: string;
		networkId?: NetworkId;
		title?: Snippet;
	}

	let {
		tokenStandard,
		customDestination = $bindable(''),
		networkId = undefined,
		title
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let activeAddressType: 'default' | 'custom' = $state(
		isNullishOrEmpty(customDestination) ? 'default' : 'custom'
	);

	let destination = $state(customDestination);
	let invalidDestination: boolean = $state();

	const back = () => dispatch('icDestinationBack');
	const apply = () => {
		customDestination = activeAddressType === 'default' ? '' : destination;

		dispatch('icDestinationBack');
	};

	let disabled = $state(true);
	run(() => {
		disabled =
			activeAddressType !== 'default' && (isNullishOrEmpty(destination) || invalidDestination);
	});
</script>

<ContentWithToolbar>
	<div class="mb-4 font-bold">{@render title?.()}</div>

	<DestinationWizardStepSection
		isActive={activeAddressType === 'default'}
		label={$i18n.convert.text.default_destination}
		on:click={() => (activeAddressType = 'default')}
	/>

	<DestinationWizardStepSection
		isActive={activeAddressType === 'custom'}
		label={$i18n.convert.text.custom_destination}
		on:click={() => (activeAddressType = 'custom')}
	>
		{#snippet content()}
			<IcSendDestination
				{tokenStandard}
				bind:destination
				bind:invalidDestination
				{networkId}
				on:icQRCodeScan
			/>
		{/snippet}
	</DestinationWizardStepSection>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={back} />

			<Button {disabled} onclick={apply}>
				{$i18n.core.text.apply}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
