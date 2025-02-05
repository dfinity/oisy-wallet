<script lang="ts">
	import { selectedTheme } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { themeStore } from '$lib/stores/settings.store';
	import { userProfileStore } from '$lib/stores/user-profile.store'
	import ThemeSelectorCard from '$lib/components/settings/ThemeSelectorCard.svelte';
	import { Themes } from '$lib/enums/themes';
	let checked: boolean;
	$: selected = $selectedTheme;

	const selectTheme = (name) => async () => {
		//themeStore.set({ key: 'theme', value: { name } });

		themeStore.set({ key: 'theme', value: { name } });
		//userProfileStore.set({profile: {}});
	};
</script>

<div class="flex flex-row">
	{#each Object.values(Themes) as theme}
	<ThemeSelectorCard label={$i18n.settings.text["appearance_" + theme]} selected={selected === theme} on:click={selectTheme(theme)} tabindex="1">
		{#await import(`$lib/assets/${theme}-theme.png`) then { default: src }}
			<img {src} alt={theme} />
		{/await}
	</ThemeSelectorCard>
	{/each}
</div>
