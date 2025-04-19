<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let disabled = false;
	export let fullWidth = false;
	export let testId: string | undefined = undefined;
</script>

<Button colorStyle="secondary-light" type="button" {disabled} {fullWidth} {testId} on:click>
	{$i18n.core.text.back}
</Button>
