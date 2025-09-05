<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		disabled?: boolean;
		testId?: string;
	}

	let { disabled = false, testId }: Props = $props();
</script>

<Button {disabled} {testId}>
	{$i18n.core.text.next}
</Button>
