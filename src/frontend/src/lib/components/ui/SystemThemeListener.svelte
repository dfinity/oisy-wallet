<script lang="ts">
	import { onMount } from 'svelte';
	import { themeStore } from '$lib/stores/theme.store';
	import { isThemeSelected } from '$lib/utils/theme.utils';

	// Update the store if OS preference changes
	const updateThemeOnChange = () => {
		// Only reset to system theme if no specific preference has been selected
		if (isThemeSelected()) {
			return;
		}

		themeStore.resetToSystemSettings();
	};

	// Set up the MediaQueryList and register the listener on mount only:
	// `window` is undefined during SSR/prerender (adapter-static).
	onMount(() => {
		const matchMediaDark = window.matchMedia('(prefers-color-scheme: dark)');
		matchMediaDark.addEventListener('change', updateThemeOnChange);

		return () => matchMediaDark.removeEventListener('change', updateThemeOnChange);
	});
</script>
