<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import IconPenLine from '$lib/components/icons/IconPenLine.svelte';
	import { SEND_DESTINATION_SECTION } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		destination: string;
		invalidDestination?: boolean;
	}
	let { destination, invalidDestination = false }: Props = $props();

	const dispatch = createEventDispatcher();

	const onIcSendDestinationStep = () => dispatch('icSendDestinationStep');
</script>

<div class="mb-10 mt-6" data-tid={SEND_DESTINATION_SECTION}>
	<div class="font-bold">{$i18n.core.text.to}</div>

	<AddressCard hasError={invalidDestination} items="center">
		{#snippet logo()}
			<div class="mr-2"><AvatarWithBadge address={destination} /></div>
		{/snippet}

		{#snippet content()}
			{shortenWithMiddleEllipsis({ text: destination })}
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
