<script lang="ts">
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import { onMount } from 'svelte';
  
	let visible = false;
	let menuButton: HTMLButtonElement;
	let menu: HTMLDivElement;
  
	function toggle() {
	  visible = !visible;
	  if (visible) positionMenu();
	}
  
	function positionMenu() {
	  const rect = menuButton.getBoundingClientRect();
	  menu.style.top = `${rect.bottom + 4}px`;
	  menu.style.left = `${rect.right}px`; // rtl align right
	}
  
	function handleClickOutside(e: MouseEvent) {
	  if (
		visible &&
		!menu.contains(e.target as Node) &&
		!menuButton.contains(e.target as Node)
	  ) {
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
	  transparent
	  link={false}
	  ariaLabel="Edit"
	>
	  {#snippet icon()}<IconPencil />{/snippet}
	</ButtonIcon>
  
	{#if visible}
	  <div class="backdrop" on:click={() => (visible = false)}></div>
	  <div bind:this={menu} class="menu__dropdown rtl" role="menu" tabindex="-1">
		<div class="menu__content">
		  <div class="menu__item">Contact image</div>
		  <div class="menu__item">Replace</div>
		  <div class="menu__item">Remove</div>
		</div>
	  </div>
	{/if}
  </div>
  
  <style>
	.backdrop {
	  position: fixed;
	  inset: 0;
	  z-index: 100;
	  background: transparent;
	}
  
	.menu__dropdown {
	  position: absolute;
	  z-index: 101;
	}
  
	.menu__content {
	  display: flex;
	  flex-direction: column;
	  padding: 12px;
	  min-width: 160px;
	  max-width: calc(100vw - 16px);
	  background: white;
	  color: black;
	  border-radius: 4px;
	  border: 1px solid #ddd;
	  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
	  cursor: default;
	}
  
	.menu__item {
	  padding: 8px 12px;
	  border-radius: 3px;
	  cursor: pointer;
	}
	.menu__item:hover {
	  background: #f0f0f0;
	}
  
	.rtl {
	  direction: rtl;
	}
  </style>
  