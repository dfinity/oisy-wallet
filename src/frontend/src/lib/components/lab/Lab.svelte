<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import IconLab from '$lib/components/icons/IconLab.svelte';
	import LabICP from '$lib/components/lab/LabICP.svelte';
	import ButtonHero from '$lib/components/ui/ButtonHero.svelte';

	let visible = false;
	let button: HTMLButtonElement | undefined;
</script>

<div class="wrapper">
	<ButtonHero bind:button on:click={() => (visible = true)} ariaLabel="Have fun">
		<IconLab slot="icon" />
		Lab
	</ButtonHero>
</div>

<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
	<ul class="flex flex-col gap-4 list-none">
		<li>
			<LabICP />
		</li>
	</ul>
</Popover>

<style lang="scss">
	.wrapper {
		width: inherit;
	}
</style>
