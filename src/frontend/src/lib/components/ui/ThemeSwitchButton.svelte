<script lang="ts">
	import IconMoon from '$lib/components/icons/IconMoon.svelte';
	import IconSun from '$lib/components/icons/IconSun.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import IconSwap from '$lib/components/ui/IconSwap.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { themeStore } from '$lib/stores/theme.store';
	import { Theme } from '$lib/types/theme';

	const handleClick = () => {
		themeStore.select($themeStore === Theme.LIGHT ? Theme.DARK : Theme.LIGHT);
	};
</script>

<ButtonIcon
	ariaLabel={$i18n.settings.alt[
		`appearance_${$themeStore === Theme.LIGHT ? Theme.DARK : Theme.LIGHT}`
	]}
	colorStyle="tertiary-alt"
	link={false}
	onclick={handleClick}
>
	{#snippet icon()}
		<IconSwap swapped={$themeStore === Theme.DARK}>
			{#snippet icon()}<IconMoon size="24" />{/snippet}
			{#snippet swappedIcon()}<IconSun size="24" />{/snippet}
		</IconSwap>
	{/snippet}
</ButtonIcon>
