<script lang="ts">
	import { onMount } from 'svelte';
	import IconImage from '$lib/components/icons/lucide/IconImage.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';

	let visible = false;
	let menuButton: HTMLButtonElement;
	let menu: HTMLDivElement;

	function toggle() {
		visible = !visible;
		if (visible) {positionMenu();}
	}

	function positionMenu() {
		const rect = menuButton.getBoundingClientRect();
		menu.style.setProperty('--popover-top', `${rect.bottom}px`);
		menu.style.setProperty('--popover-left', `${rect.right}px`);
		menu.style.setProperty('--popover-right', `${window.innerWidth - rect.left}px`);
	}

	function handleClickOutside(e: MouseEvent) {
		if (visible && !menu.contains(e.target as Node) && !menuButton.contains(e.target as Node)) {
			visible = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		window.addEventListener('resize', () => visible && positionMenu());
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<div style="position: relative; display: inline-block;">
	<ButtonIcon
		bind:button={menuButton}
		onclick={toggle}
		colorStyle="tertiary-alt"
		styleClass="w-auto h-auto p-0"
		transparent
		link={false}
		ariaLabel="Edit"
	>
		{#snippet icon()}<IconPencil />{/snippet}
	</ButtonIcon>

	{#if visible}
		<div class="backdrop" on:click={() => (visible = false)}></div>
		<div
			bind:this={menu}
			class="custom-popover wrapper animate-fade-in with-border"
			role="menu"
			tabindex="-1"
		>
			<div class="popover-item popover-title">Contact image</div>
			<div class="popover-item">
				<IconImage />
				Replace</div
			>
			<div class="popover-item"> <IconTrash />Remove</div>
		</div>
	{/if}
</div>
