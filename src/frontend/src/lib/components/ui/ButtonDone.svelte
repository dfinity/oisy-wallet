<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<Button fullWidth type="button" on:click>
	{$i18n.core.text.done}
</Button>
