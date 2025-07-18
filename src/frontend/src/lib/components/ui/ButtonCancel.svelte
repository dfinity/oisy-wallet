<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onclick: () => void;
		disabled?: boolean;
		fullWidth?: boolean;
		testId?: string;
	}

	let { onclick, disabled = false, fullWidth = false, testId }: Props = $props();
</script>

<Button {testId} colorStyle="secondary-light" type="button" {fullWidth} {disabled} {onclick}>
	{$i18n.core.text.cancel}
</Button>
