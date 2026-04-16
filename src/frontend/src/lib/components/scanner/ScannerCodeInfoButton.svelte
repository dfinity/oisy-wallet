<script lang="ts">
	import IconHelpCircle from '$lib/components/icons/IconHelpCircle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onclick: () => void;
	}

	let { onclick }: Props = $props();
</script>

<Button fullWidth link {onclick} styleClass="text-secondary bg-surface py-4 rounded-none">
	<span>{replaceOisyPlaceholders($i18n.scanner.text.what_is_scan)}</span>

	<IconHelpCircle />
</Button>
