<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		isPrimary?: boolean;
	}

	let { isPrimary = false }: Props = $props();
</script>

<Button
	colorStyle={isPrimary ? 'primary' : 'secondary-light'}
	fullWidth
	onclick={modalStore.close}
	paddingSmall
	type="button"
>
	{$i18n.core.text.close}
</Button>
