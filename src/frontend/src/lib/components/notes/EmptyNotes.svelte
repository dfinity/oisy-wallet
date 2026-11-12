<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconNotebook from '$lib/components/icons/lucide/IconNotebook.svelte';
	import NotesPrivacyInfoBox from '$lib/components/notes/NotesPrivacyInfoBox.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { NOTES_ADD_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		// Optional: omitted while there is no editor yet, so the empty state renders
		// without an "Add note" button.
		onAddNote?: () => void;
		disabled?: boolean;
		compact?: boolean;
	}

	let { onAddNote, disabled = false, compact = false }: Props = $props();
</script>

<div class="flex flex-col items-center gap-8 text-center" class:compact>
	<div
		class="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-subtle-10 text-tertiary"
	>
		<IconNotebook size="28" />
	</div>

	<div class="flex flex-col gap-3">
		{#if compact}<h2>{$i18n.notes.text.empty_title}</h2>{:else}<h1
				>{$i18n.notes.text.empty_title}</h1
			>{/if}
		<span class="text-tertiary">{$i18n.notes.text.empty_subtitle}</span>
	</div>

	{#if nonNullish(onAddNote)}
		<Button {disabled} onclick={onAddNote} testId={NOTES_ADD_BUTTON}>
			{$i18n.notes.text.empty_add}
		</Button>
	{/if}

	<NotesPrivacyInfoBox />
</div>

<style lang="scss">
	.compact {
		gap: 24px;
		padding-top: 24px;
	}
	.compact h2 {
		font-size: 22px;
		line-height: 1.3;
		text-wrap: balance;
	}
	.compact span {
		font-size: 15px;
		line-height: 1.5;
		text-wrap: pretty;
	}
</style>
