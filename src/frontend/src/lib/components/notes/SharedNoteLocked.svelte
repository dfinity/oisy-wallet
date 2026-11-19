<script lang="ts">
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		NOTES_SHARE_RECIPIENT_LOCKED,
		NOTES_SHARE_RECIPIENT_REVEAL_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		busy: boolean;
		onReveal: () => void;
	}

	let { busy, onReveal }: Props = $props();
</script>

<div
	class="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center"
	data-tid={NOTES_SHARE_RECIPIENT_LOCKED}
>
	<div class="text-success-primary"><IconShieldCheck size="48" /></div>
	<h1 class="text-xl font-bold text-primary">{$i18n.notes.share.recipient.locked_title}</h1>
	<Button
		colorStyle="primary"
		loading={busy}
		onclick={onReveal}
		testId={NOTES_SHARE_RECIPIENT_REVEAL_BUTTON}
		type="button"
	>
		{$i18n.notes.share.recipient.reveal}
	</Button>
</div>
