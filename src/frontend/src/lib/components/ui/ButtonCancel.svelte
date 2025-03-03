<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let disabled = false;
</script>

<Button colorStyle="secondary-light" type="button" {disabled} on:click>
	{$i18n.core.text.cancel}
</Button>
