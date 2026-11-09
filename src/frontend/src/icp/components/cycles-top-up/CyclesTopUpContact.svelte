<script lang="ts">
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import SendContactName from '$lib/components/send/SendContactName.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import type { Address } from '$lib/types/address';
	import type { ContactUi } from '$lib/types/contact';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		// One of the contact's addresses, a canister ID.
		address: Address;
		contact: ContactUi;
		onSelect: (canisterId: string) => void;
	}

	let { address, contact, onSelect }: Props = $props();
</script>

<LogoButton onClick={() => onSelect(address)}>
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
</LogoButton>
