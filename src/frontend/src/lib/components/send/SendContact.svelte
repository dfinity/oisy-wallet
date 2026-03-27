<script lang="ts">
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import SendContactName from '$lib/components/send/SendContactName.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { SEND_DESTINATION_WIZARD_CONTACT } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address } from '$lib/types/address';
	import type { ContactUi } from '$lib/types/contact';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		address: Address;
		contact: ContactUi;
		onClick: () => void;
	}

	let { contact, address, onClick }: Props = $props();
</script>

<LogoButton
	{onClick}
	styleClass="group"
	testId={`${SEND_DESTINATION_WIZARD_CONTACT}-${contact.name}`}
>
	{#snippet logo()}
		<div class="mr-2">
			<AvatarWithBadge badge={{ type: 'addressType', address }} {contact} variant="sm" />
		</div>
	{/snippet}

	{#snippet title()}
		<SendContactName {address} {contact} />
	{/snippet}

	{#snippet description()}
		{shortenWithMiddleEllipsis({ text: address })}
	{/snippet}

	{#snippet descriptionEnd()}
		<div class="hidden text-brand-primary group-hover:block">
			{$i18n.send.text.send}
		</div>
	{/snippet}
</LogoButton>
