<script lang="ts">
	import type { Snippet } from 'svelte';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { setPrivacyMode } from '$lib/utils/privacy.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const handleKeydown = (e: KeyboardEvent) => {
		const isInputField = e?.target instanceof HTMLInputElement;
		const hasModifier = e.ctrlKey || e.altKey || e.shiftKey || e.metaKey;

		if (!isInputField) {
			if (e.key.toLowerCase() === $i18n.shortcuts.privacy_mode.toLowerCase() && !hasModifier) {
				setPrivacyMode({ enabled: !$isPrivacyMode, withToast: true, source: 'Pressing P shortcode' });
			}
		}
	};
</script>

{@render children?.()}

<svelte:window on:keydown={handleKeydown} />
