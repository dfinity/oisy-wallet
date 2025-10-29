<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import IconPenLine from '$lib/components/icons/IconPenLine.svelte';
	import SendContactName from '$lib/components/send/SendContactName.svelte';
	import { SEND_DESTINATION_SECTION } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		destination: string;
		invalidDestination?: boolean;
		selectedContact?: ContactUi;
		onSendDestinationStep: () => void;
	}

	let {
		destination,
		invalidDestination = false,
		selectedContact,
		onSendDestinationStep
	}: Props = $props();

	let addressToDisplay = $derived(shortenWithMiddleEllipsis({ text: destination }));
</script>

<div class="mt-6 mb-10" data-tid={SEND_DESTINATION_SECTION}>
	<div class="font-bold">{$i18n.core.text.to}</div>

	<AddressCard hasError={invalidDestination} items="center">
		{#snippet logo()}
			<div class="mr-2">
				<AvatarWithBadge
					address={destination}
					badge={{ type: 'addressType', address: destination }}
					contact={selectedContact}
				/>
			</div>
		{/snippet}

		{#snippet content()}
			{#if isNullish(selectedContact)}
				{addressToDisplay}
			{:else}
				<SendContactName address={destination} contact={selectedContact} />

				<span class="text-sm text-tertiary">{addressToDisplay}</span>
			{/if}
		{/snippet}

		{#snippet actions()}
			<button
				class="text-brand-primary"
				aria-label={$i18n.core.text.back}
				onclick={onSendDestinationStep}
			>
				<IconPenLine />
			</button>
		{/snippet}
	</AddressCard>
</div>
