<script lang="ts">
	import type { Snippet } from 'svelte';
	import ReceiveAddressQrCodeContent from '$lib/components/receive/ReceiveAddressQrCodeContent.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { RECEIVE_TOKENS_MODAL_QR_CODE_OUTPUT } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import type { Token } from '$lib/types/token';

	interface Props {
		address?: string;
		addressLabel?: string;
		addressToken?: Token;
		network: Network;
		copyAriaLabel: string;
		testId?: string;
		onBack: () => void;
		text?: Snippet;
	}

	let { address, addressLabel, addressToken, network, copyAriaLabel, testId, onBack, text }: Props =
		$props();
</script>

<ContentWithToolbar styleClass="min-h-50vh" {testId}>
	<ReceiveAddressQrCodeContent
		{address}
		{addressLabel}
		{addressToken}
		{copyAriaLabel}
		{network}
		testId={RECEIVE_TOKENS_MODAL_QR_CODE_OUTPUT}
		{text}
	/>

	{#snippet toolbar()}
		<Button colorStyle="secondary-light" fullWidth onclick={onBack}>
			{$i18n.core.text.back}
		</Button>
	{/snippet}
</ContentWithToolbar>
