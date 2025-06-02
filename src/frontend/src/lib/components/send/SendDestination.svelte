<script lang="ts">
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import Divider from '$lib/components/common/Divider.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import IconPenLine from '$lib/components/icons/IconPenLine.svelte';
	import { SEND_DESTINATION_SECTION } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		destination: string;
		invalidDestination?: boolean;
		selectedContact?: ContactUi;
	}
	let { destination, invalidDestination = false, selectedContact }: Props = $props();

	const dispatch = createEventDispatcher();

	const onIcSendDestinationStep = () => dispatch('icSendDestinationStep');

	let addressToDisplay = $derived(shortenWithMiddleEllipsis({ text: destination }));

	let selectedContactLabel = $derived(
		nonNullish(selectedContact)
			? selectedContact.addresses.find(({ address }) => address === destination)?.label
			: undefined
	);
</script>

<div class="mb-10 mt-6" data-tid={SEND_DESTINATION_SECTION}>
	<div class="font-bold">{$i18n.core.text.to}</div>

	<AddressCard hasError={invalidDestination} items="center">
		{#snippet logo()}
			<div class="mr-2"><AvatarWithBadge contact={selectedContact} address={destination} /></div>
		{/snippet}

		{#snippet content()}
			{#if isNullish(selectedContact)}
				{addressToDisplay}
			{:else}
				<span>
					{selectedContact.name}

					{#if notEmptyString(selectedContactLabel)}
						<Divider />
						{selectedContactLabel}
					{/if}
				</span>
				<span class="text-sm text-tertiary">{addressToDisplay}</span>
			{/if}
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
