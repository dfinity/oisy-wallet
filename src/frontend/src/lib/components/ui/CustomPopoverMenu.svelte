<script lang="ts">
	import { type SvelteComponent, tick } from 'svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';

	interface Props {
		title?: string;
		items: Array<{
			logo: typeof SvelteComponent;
			title: string;
			action: () => void;
		}>;
	}

	let { title, items }: Props = $props();

	let visible = $state(false);
	let triggerBtn: HTMLElement;
	let menu = $state<HTMLElement | null>(null);

	const toggle = () => {
		visible = !visible;
		if (visible) {
			tick().then(() => {
				if (triggerBtn && menu) {
					positionMenu();
				}
			});
		}
	};

	const positionMenu = () => {
		if (!triggerBtn || !menu) {
			return;
		}
		const rect = triggerBtn.getBoundingClientRect();
		menu.style.setProperty('--popover-top', `${rect.bottom}px`);
		menu.style.setProperty('--popover-left', `${rect.right}px`);
		menu.style.setProperty('--popover-right', `${window.innerWidth - rect.left}px`);
	};

	const handleClickOutside = (e: MouseEvent) => {
		if (
			visible &&
			menu &&
			!menu.contains(e.target as Node) &&
			triggerBtn &&
			!triggerBtn.contains(e.target as Node)
		) {
			visible = false;
		}
	};

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
	<slot name="trigger" {toggle} bindTrigger={(el: HTMLElement) => (triggerBtn = el)} />

	{#if visible}
		<button
			type="button"
			class="backdrop"
			aria-label="Close menu"
			onclick={() => (visible = false)}
		/>
		<div
			bind:this={menu}
			class="custom-popover wrapper animate-fade-in with-border"
			role="menu"
			tabindex="-1"
		>
			{#if title}
				<div class="popover-item popover-title text-base">{title}</div>
			{/if}
			{#each items as item (item.title)}
				<LogoButton
					hover
					rounded={false}
					condensed
					styleClass="popover-item w-full px-0"
					onClick={() => {
						item.action();
						visible = false;
					}}
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
