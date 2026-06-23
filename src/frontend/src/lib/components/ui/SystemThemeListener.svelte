<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { themeStore } from '$lib/stores/theme.store';
	import { isThemeSelected } from '$lib/utils/theme.utils';

	// Set up our MediaQueryList
	const matchMediaDark = window.matchMedia('(prefers-color-scheme: dark)');

	// Update the store if OS preference changes
	const updateThemeOnChange = () => {
		// Only reset to system theme if no specific preference has been selected
		if (isThemeSelected()) {
			return;
		}

		themeStore.resetToSystemSettings();
	};

	// Register change event on mount
	onMount(() => matchMediaDark.addEventListener('change', updateThemeOnChange));

	// Clean up if this component is destroyed
	onDestroy(() => matchMediaDark.removeEventListener('change', updateThemeOnChange));
</script>
