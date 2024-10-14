<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let disabled = false;
</script>

<Button {disabled}>
	{$i18n.core.text.next}
</Button>
