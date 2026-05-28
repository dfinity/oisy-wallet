<script lang="ts" module>
	export type ScannedPlainAddressNoticeVariant = 'multi-token' | 'single-token' | 'multi-network';
</script>

<script lang="ts">
	import { getContext } from 'svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { SEND_SCANNED_PLAIN_ADDRESS_NOTICE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY } from '$lib/stores/scanned-plain-address-send.store';

	interface Props {
		styleClass?: string;
		variant?: ScannedPlainAddressNoticeVariant;
	}

	let { styleClass, variant = 'multi-token' }: Props = $props();

	const show = getContext<boolean>(SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY) ?? false;

	let copy = $derived(
		variant === 'single-token'
			? $i18n.send.info.scanned_address_only_destination_single_token
			: variant === 'multi-network'
				? $i18n.send.info.scanned_address_only_destination_multi_network
				: $i18n.send.info.scanned_address_only_destination
	);
</script>

{#if show}
	<MessageBox level="warning" {styleClass} testId={SEND_SCANNED_PLAIN_ADDRESS_NOTICE}>
		{copy}
	</MessageBox>
{/if}
