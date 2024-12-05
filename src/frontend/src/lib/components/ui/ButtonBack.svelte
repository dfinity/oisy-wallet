<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let disabled = false;
	export let fullWidth = false;
</script>

<Button colorStyle="secondary" type="button" {disabled} {fullWidth} on:click>
	{$i18n.core.text.back}
</Button>
