<script lang="ts">
	import { themeStore, Theme } from '@dfinity/gix-components';
	import IconMoon from '$lib/components/icons/IconMoon.svelte';
	import IconSun from '$lib/components/icons/IconSun.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	const handleClick = () => {
		themeStore.select($themeStore === Theme.LIGHT ? Theme.DARK : Theme.LIGHT);
	};
</script>

<ButtonIcon
	colorStyle="tertiary-alt"
	ariaLabel={$i18n.settings.alt[
		`appearance_${$themeStore === Theme.LIGHT ? Theme.DARK : Theme.LIGHT}`
	]}
	onclick={handleClick}
	link={false}
>
	{#snippet icon()}
		<span>
			{#if $themeStore === Theme.DARK}
				<IconSun size="24" />
			{:else}
				<IconMoon size="24" />
			{/if}
		</span>
	{/snippet}
</ButtonIcon>
