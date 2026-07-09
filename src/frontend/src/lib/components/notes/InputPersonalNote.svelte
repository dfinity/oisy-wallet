<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import { MAX_PERSONAL_NOTE_LENGTH } from '$lib/constants/app.constants';
	import { NOTES_INPUT } from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { personalNoteLength } from '$lib/utils/personal-note.utils';

	interface Props {
		value: string;
		isValid: boolean;
		disabled?: boolean;
		// Called on Cmd+Enter (macOS) / Ctrl+Enter (Windows/Linux) so the caller can
		// trigger the same save/create action as its Save button. Plain Enter and
		// Shift+Enter are left untouched (they keep inserting a line break).
		onSubmit?: () => void;
	}

	let { value = $bindable(), isValid = $bindable(), disabled = false, onSubmit }: Props = $props();

	let textarea = $state<HTMLTextAreaElement | undefined>();

	// Trim before measuring and validating (the trimmed value is what gets stored);
	// the cap is counted in Unicode code points, not UTF-16 units, so emoji / CJK /
	// astral characters count as the user sees them.
	const trimmed = $derived(value.trim());
	const isTooLong = $derived(personalNoteLength(trimmed) > MAX_PERSONAL_NOTE_LENGTH);

	$effect(() => {
		isValid = notEmptyString(trimmed) && !isTooLong;
	});

	// Auto-focus on open so the user can type immediately: add opens empty with the
	// caret ready; edit places the caret at the end. preventScroll keeps focusing
	// from yanking the surrounding modal/list.
	$effect(() => {
		const element = textarea;
		if (element === undefined) {
			return;
		}
		const end = element.value.length;
		element.setSelectionRange(end, end);
		element.focus({ preventScroll: true });
	});

	// A textarea reports no content height to flex layout, so on its own it can't
	// drive the modal's height the way the read-only view's rendered text does.
	// Setting an explicit height = scrollHeight gives `flex-auto` a real basis so the
	// modal grows with the note (matching view mode). The `max-h` below caps that
	// growth to the space the capped modal leaves, so a long note scrolls inside the
	// textarea (like the view box) rather than letting the box grow without bound.
	$effect(() => {
		const element = textarea;
		if (element === undefined) {
			return;
		}
		value; // track value changes
		element.style.height = 'auto';
		element.style.height = `${element.scrollHeight}px`;
	});

	// Cmd+Enter / Ctrl+Enter saves; plain Enter and Shift+Enter fall through
	// unhandled so the textarea inserts a line break as usual.
	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			onSubmit?.();
		}
	};
</script>

<div style="--input-font-size: var(--text-base)" class="flex w-full flex-1 flex-col gap-2">
	<!-- A flat, bordered white field (same box style as the read-only note view) —
		no tinted panel and no redundant "Note" label; the accessible name moves to
		aria-label. The border brightens to brand-primary on focus (like the app's
		text inputs) so the active field is distinguishable from its resting state. -->
	<textarea
		bind:this={textarea}
		class="min-h-32 w-full flex-1 resize-none overflow-y-auto rounded-lg border border-brand-subtle-20 bg-primary p-4 text-base font-normal text-primary outline-none transition-colors placeholder:text-tertiary focus:border-brand-primary md:flex-auto md:max-h-[calc(80dvh_-_28rem)]"
		aria-label={$i18n.notes.text.note_label}
		data-tid={NOTES_INPUT}
		{disabled}
		onkeydown={onKeydown}
		placeholder={$i18n.notes.text.placeholder}
		bind:value></textarea>
	{#if isTooLong}
		<p class="text-error-primary" transition:slide={SLIDE_DURATION}>
			{replacePlaceholders($i18n.notes.text.too_long, {
				$maxCharacters: `${MAX_PERSONAL_NOTE_LENGTH}`
			})}
		</p>
	{/if}
</div>
