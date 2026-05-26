<script lang="ts">
	import { getContext } from 'svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { SEND_SCANNED_ADDRESS_NOTICE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SCANNED_ADDRESS_NOTICE_CONTEXT_KEY } from '$lib/stores/scanned-address-notice.store';

	const show = getContext<boolean>(SCANNED_ADDRESS_NOTICE_CONTEXT_KEY) ?? false;
</script>

{#if show}
	<MessageBox level="warning" testId={SEND_SCANNED_ADDRESS_NOTICE}>
		{$i18n.send.info.scanned_address_only_destination}
	</MessageBox>
{/if}
