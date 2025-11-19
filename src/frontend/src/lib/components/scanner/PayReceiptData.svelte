<script lang="ts">
	import type { Recipient } from '$lib/types/open-crypto-pay';
	import CollapsibleBottomSheet from '$lib/components/ui/CollapsibleBottomSheet.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatAddress } from '$lib/utils/open-crypto-pay.utils';

	interface Props {
		recipient: Recipient;
	}

	let { recipient }: Props = $props();
</script>

<CollapsibleBottomSheet buttonTestId={'collapsible-btn'}>
	{#snippet contentHeader()}
		<ModalValue>
			{#snippet label()}{$i18n.scanner.text.receipt}{/snippet}

			{#snippet mainValue()}{recipient?.name ?? '-'}{/snippet}
		</ModalValue>
	{/snippet}
	{#snippet content()}
		<ModalValue>
			{#snippet label()}
				{$i18n.scanner.text.name}
			{/snippet}

			{#snippet secondaryValue()}
				<div class="text-sm">{recipient?.name ?? '-'}</div>
			{/snippet}
		</ModalValue>

		<ModalValue>
			{#snippet label()}
				{$i18n.scanner.text.address}
			{/snippet}

			{#snippet secondaryValue()}
				<div class="text-sm">{formatAddress(recipient?.address)}</div>
			{/snippet}
		</ModalValue>

		<ModalValue>
			{#snippet label()}
				{$i18n.scanner.text.country}
			{/snippet}

			{#snippet secondaryValue()}
				<div class="text-sm">{recipient?.address?.country ?? '-'}</div>
			{/snippet}
		</ModalValue>

		<ModalValue>
			{#snippet label()}
				{$i18n.scanner.text.phone_number}
			{/snippet}

			{#snippet secondaryValue()}
				<div class="text-sm">{recipient?.phone ?? '-'}</div>
			{/snippet}
		</ModalValue>

		<ModalValue>
			{#snippet label()}
				{$i18n.scanner.text.email_address}
			{/snippet}

			{#snippet secondaryValue()}
				<div class="text-sm">{recipient?.mail ?? '-'}</div>
			{/snippet}
		</ModalValue>

		<ModalValue>
			{#snippet label()}
				{$i18n.scanner.text.website}
			{/snippet}

			{#snippet secondaryValue()}
				<div class="text-sm">{recipient?.website ?? '-'}</div>
			{/snippet}
		</ModalValue>
	{/snippet}
</CollapsibleBottomSheet>
