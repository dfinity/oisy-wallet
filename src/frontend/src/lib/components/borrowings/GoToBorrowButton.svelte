<script lang="ts">
	import { goto } from '$app/navigation';
	import GoToButton from '$lib/components/common/GoToButton.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { BORROWINGS_GOTO_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<GoToButton
	label={$i18n.borrowings.text.go_to_borrow}
	onclick={() => goto(AppPath.Borrow)}
	testId={BORROWINGS_GOTO_BUTTON}
/>
