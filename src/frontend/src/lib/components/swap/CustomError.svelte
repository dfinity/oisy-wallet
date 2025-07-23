<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import ExternalLink from '../ui/ExternalLink.svelte';

	interface Props {
		firstMessage: string;
		firstLink: { url: string; text: string };
		secondMessage: string;
		secondLink: { url: string; text: string };
	}

	let { firstMessage, firstLink, secondMessage, secondLink }: Props = $props();
</script>

{firstMessage}
<ExternalLink iconSize="15" href={firstLink.url} ariaLabel={$i18n.swap.text.open_instructions_link}
	>{firstLink.text}</ExternalLink
>
{secondMessage}

<ExternalLink iconSize="15" href={secondLink.url} ariaLabel={$i18n.swap.text.open_icp_swap}
	>{secondLink.text}</ExternalLink
>
