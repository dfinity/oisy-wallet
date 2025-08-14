<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onclick: () => void;
		testId?: string;
		variant?: 'primary' | 'secondary-light';
	}

	let { onclick, testId, variant = 'primary' }: Props = $props();
</script>

<Button colorStyle={variant} paddingSmall {testId} fullWidth type="button" {onclick}>
	{$i18n.core.text.done}
</Button>
