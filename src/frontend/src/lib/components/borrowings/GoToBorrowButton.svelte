<script lang="ts">
	import { goto } from '$app/navigation';
	import IconArrowRight from '$lib/components/icons/IconArrowRight.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { BORROWINGS_GOTO_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<Button
	colorStyle="success"
	onclick={() => goto(AppPath.Borrow)}
	styleClass="gap-1 flex-none px-12 font-semibold"
	testId={BORROWINGS_GOTO_BUTTON}
	type="button"
>
	{$i18n.borrowings.text.go_to_borrow}
	<IconArrowRight />
</Button>
