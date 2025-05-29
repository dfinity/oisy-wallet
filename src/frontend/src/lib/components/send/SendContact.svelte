<script lang="ts">
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
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

<LogoButton styleClass="group" {onClick}>
	{#snippet logo()}
		<AvatarWithBadge {contact} badge={{ type: 'addressType', address }} variant="sm" />
	{/snippet}

	{#snippet title()}
		{contact.name}
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
