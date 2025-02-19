<script lang="ts">
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { themeStore, Theme } from '@dfinity/gix-components';
	import IconSun from '$lib/components/icons/IconSun.svelte';
	import IconMoon from '$lib/components/icons/IconMoon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ButtonColorStyle } from '$lib/types/style';

	let colorStyle: ButtonColorStyle;

	const handleClick = () => {
		themeStore.select($themeStore === Theme.LIGHT ? Theme.DARK : Theme.LIGHT);
	};
</script>

<ButtonIcon
	colorStyle="tertiary-alt"
	ariaLabel={$i18n.settings.alt[
		`appearance_${$themeStore === Theme.LIGHT ? Theme.DARK : Theme.LIGHT}`
	]}
	on:click={handleClick}
>
	<span slot="icon">
		{#if $themeStore === Theme.DARK}
			<IconSun size="44" />
		{:else}
			<IconMoon size="18" />
		{/if}</span
	>
</ButtonIcon>
