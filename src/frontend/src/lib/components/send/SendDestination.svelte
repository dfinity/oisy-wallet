<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import IconPenLine from '$lib/components/icons/IconPenLine.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import { SEND_DESTINATION_SECTION } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

	interface Props {
		destination: string;
		invalidDestination?: boolean;
	}
	let { destination, invalidDestination = false }: Props = $props();

	const dispatch = createEventDispatcher();

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const onIcSendDestinationStep = () => dispatch('icSendDestinationStep');
</script>

<div class="mb-10 mt-6" data-tid={SEND_DESTINATION_SECTION}>
	<div class="font-bold">{$i18n.core.text.to}</div>

	<AddressCard hasError={invalidDestination} items="center">
		{#snippet logo()}
			<NetworkLogo network={$sendToken.network} />
		{/snippet}

		{#snippet content()}
			{destination}
		{/snippet}

		{#snippet actions()}
			<button
				class="text-brand-primary"
				onclick={onIcSendDestinationStep}
				aria-label={$i18n.core.text.back}
			>
				<IconPenLine />
			</button>
		{/snippet}
	</AddressCard>
</div>
