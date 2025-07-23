<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import ExternalLink from '../ui/ExternalLink.svelte';
	import MessageBox from '../ui/MessageBox.svelte';

	let { firstMessage, firstLink, secondMessage, secondLink } = $props();
</script>

<MessageBox level="error">
	{firstMessage}
	<ExternalLink href={firstLink.url} ariaLabel={$i18n.swap.text.open_icp_swap}
		>{firstLink.text}</ExternalLink
	>
	{secondMessage}

	<ExternalLink href={secondLink.url} ariaLabel={$i18n.swap.text.open_icp_swap}
		>{secondLink.text}</ExternalLink
	>
</MessageBox>
