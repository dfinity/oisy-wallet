<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onclick: () => void;
		testId?: string;
	}

	let { onclick, testId }: Props = $props();
</script>

<Button colorStyle="primary" fullWidth {onclick} paddingSmall {testId} type="button">
	{$i18n.core.text.done}
</Button>
