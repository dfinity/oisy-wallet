<script lang="ts">
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	// TODO: display filtered contacts in this component
</script>

<EmptyState
	title={$i18n.send.text.contacts_empty_state_title}
	description={$i18n.send.text.contacts_empty_state_description}
/>
