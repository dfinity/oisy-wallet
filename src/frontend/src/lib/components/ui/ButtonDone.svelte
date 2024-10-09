<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let type: 'submit' | 'reset' | 'button' = 'submit';
</script>

<Button {type} fullWidth on:click>
	{$i18n.core.text.done}
</Button>
