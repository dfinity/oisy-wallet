<script lang="ts">
	import { getContext } from 'svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { SEND_SCANNED_PLAIN_ADDRESS_NOTICE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY } from '$lib/stores/scanned-plain-address-send.store';

	interface Props {
		styleClass?: string;
		singleToken?: boolean;
	}

	let { styleClass, singleToken = false }: Props = $props();

	const show = getContext<boolean>(SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY) ?? false;
</script>

{#if show}
	<MessageBox level="warning" {styleClass} testId={SEND_SCANNED_PLAIN_ADDRESS_NOTICE}>
		{singleToken
			? $i18n.send.info.scanned_address_only_destination_single_token
			: $i18n.send.info.scanned_address_only_destination}
	</MessageBox>
{/if}
