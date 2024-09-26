<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let type: 'submit' | 'reset' | 'button' = 'submit';
	export let disabled = false;
</script>

<Button colorStyle="secondary" {type} {disabled} on:click>
	{$i18n.core.text.back}
</Button>
