<script lang="ts">
	import { IconMenu, Popover } from '@dfinity/gix-components';
	import AboutHow from '$lib/components/hero/about/AboutHow.svelte';
	import AboutWhat from '$lib/components/hero/about/AboutWhat.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const hidePopover = () => (visible = false);
</script>

<div class="hidden md:flex gap-5">
	<AboutWhat />
	<AboutHow />
</div>

<div class="flex md:hidden">
	<ButtonIcon
		bind:button
		on:click={() => (visible = !visible)}
		ariaLabel={replaceOisyPlaceholders($i18n.about.text.title)}
	>
		<IconMenu slot="icon" />
		{replaceOisyPlaceholders($i18n.about.text.title)}
	</ButtonIcon>

	<Popover bind:visible anchor={button} direction="rtl">
		<ul class="flex flex-col gap-4 list-none">
			<li><AboutWhat asMenuItem on:icOpenAboutModal={hidePopover} /></li>
			<li><AboutHow asMenuItem on:icOpenAboutModal={hidePopover} /></li>
		</ul>
	</Popover>
</div>
