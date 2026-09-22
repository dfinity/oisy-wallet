<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		retrying?: boolean;
		onRetry: () => void;
		onClose: () => void;
	}

	let { retrying = false, onRetry, onClose }: Props = $props();
</script>

<ContentWithToolbar testId="xrp-send-retry">
	<MessageBox level="error" testId="xrp-send-retry-message">
		{$i18n.send.error.xrp_confirmation_failed}
	</MessageBox>

	<p class="text-sm text-tertiary">
		{$i18n.send.text.xrp_retry_description}
	</p>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel disabled={retrying} fullWidth onclick={onClose} testId="xrp-send-retry-close" />

			<Button
				disabled={retrying}
				fullWidth
				loading={retrying}
				onclick={onRetry}
				testId="xrp-send-retry-submit"
				type="button"
			>
				{$i18n.send.text.xrp_retry}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
