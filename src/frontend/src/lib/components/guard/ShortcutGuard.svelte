<script lang="ts">
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { setPrivacyMode } from '$lib/utils/privacy.utils';

	const handleKeydown = (e: KeyboardEvent) => {
		const { target } = e;
		// Don't trigger shortcuts while the user is typing into a field: inputs,
		// textareas (e.g. the note editor), or any contenteditable element.
		const isInputField =
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			(target instanceof HTMLElement && target.isContentEditable);
		const hasModifier = e.ctrlKey || e.altKey || e.shiftKey || e.metaKey;

		if (!isInputField) {
			if (e.key.toLowerCase() === $i18n.shortcuts.privacy_mode.toLowerCase() && !hasModifier) {
				setPrivacyMode({
					enabled: !$isPrivacyMode,
					withToast: true,
					source: 'Keypress P'
				});
			}
		}
	};
</script>

<svelte:window onkeydown={handleKeydown} />
