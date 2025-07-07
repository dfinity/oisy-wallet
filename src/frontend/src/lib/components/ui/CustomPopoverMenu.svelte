
<script context="module" lang="ts">
	import type { SvelteComponent } from 'svelte';
	export interface IPopoverItem {
	  logo: typeof SvelteComponent;
	  title: string;
	  action: () => void;
	}
  </script>

<script lang="ts">
	import { tick } from 'svelte';
		import LogoButton from '$lib/components/ui/LogoButton.svelte';

	let { title = '', items = [] as IPopoverItem[] } = $props<{
		title?: string;
		items?: IPopoverItem[];
	}>();

	let visible = $state(false);
	let triggerBtn: HTMLElement;
	let menu: HTMLElement;

	function toggle() {
		visible = !visible;
		if (visible) {
			tick().then(() => {
				if (triggerBtn && menu) {positionMenu();}
			});
		}
	}

	function positionMenu() {
		if (!triggerBtn || !menu) {return;}
		const rect = triggerBtn.getBoundingClientRect();
		menu.style.setProperty('--popover-top', `${rect.bottom}px`);
		menu.style.setProperty('--popover-left', `${rect.right}px`);
		menu.style.setProperty('--popover-right', `${window.innerWidth - rect.left}px`);
	}

	function handleClickOutside(e: MouseEvent) {
		if (visible && !menu.contains(e.target as Node) && !triggerBtn.contains(e.target as Node)) {
			visible = false;
		}
	}

	$effect(() => {
		if (visible) {
			document.addEventListener('click', handleClickOutside);
			window.addEventListener('resize', positionMenu);
			return () => {
				document.removeEventListener('click', handleClickOutside);
				window.removeEventListener('resize', positionMenu);
			};
		}
	});
</script>

<div class="custom-popover-trigger">
	<slot name="trigger" {toggle} bindTrigger={(el) => (triggerBtn = el)} />

	{#if visible}
		<div class="backdrop" on:click={() => (visible = false)}></div>
		<div
			bind:this={menu}
			class="custom-popover wrapper animate-fade-in with-border"
			role="menu"
			tabindex="-1"
		>
			{#if title}
				<div class="popover-item popover-title text-base">{title}</div>
			{/if}

			{#each items as item}
				<LogoButton
					hover
					rounded={false}
					condensed
					styleClass="popover-item w-full px-0"
					onClick={() => 
						item.action();
						visible = false;
					}
					>
					{#snippet logo()}
						<svelte:component this={item.logo} />
					{/snippet}
					{#snippet title()}
						<span class="text-base font-normal">{item.title}</span>
					{/snippet}
				</LogoButton>
			{/each}
		</div>
	{/if}
</div>
