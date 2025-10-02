<script lang="ts">
	import type { Snippet } from 'svelte';
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
		title: Snippet;
		onDestinationBack: () => void;
		onQRCodeScan: () => void;
	}

	let {
		tokenStandard,
		customDestination = $bindable(''),
		networkId,
		title,
		onDestinationBack,
		onQRCodeScan
	}: Props = $props();

	let activeAddressType = $state(isNullishOrEmpty(customDestination) ? 'default' : 'custom');

	let destination = $state(customDestination);
	let invalidDestination = $state(false);

	const back = () => onDestinationBack();
	const apply = () => {
		customDestination = activeAddressType === 'default' ? '' : destination;

		onDestinationBack();
	};

	let disabled = $derived(
		activeAddressType !== 'default' && (isNullishOrEmpty(destination) || invalidDestination)
	);
</script>

<ContentWithToolbar>
	<div class="mb-4 font-bold">{@render title()}</div>

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
		<IcSendDestination
			slot="content"
			{networkId}
			{onQRCodeScan}
			{tokenStandard}
			bind:destination
			bind:invalidDestination
		/>
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
