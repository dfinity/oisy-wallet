<script lang="ts">
	import IconlyUfo from '$lib/components/icons/iconly/IconlyUfo.svelte';
</script>

<div class="ufo-wrapper">
	<IconlyUfo />
</div>

<style lang="scss">
	:global(a.nav-item:hover .ufo-wrapper .dome) {
		animation: dome-animation 0.75s ease-in-out infinite alternate;
	}

	:global(a.nav-item:hover .ufo-wrapper .bottom-lines) {
		transform-origin: 10px 10px;
		animation: speed-lines 0.75s ease-in-out infinite alternate;
	}

	:global(a.nav-item:hover .ufo-wrapper .window1) {
		animation: blink-window1 0.75s linear infinite;
	}

	:global(a.nav-item:hover .ufo-wrapper .window2) {
		animation: blink-window2 0.75s linear infinite;
	}

	:global(a.nav-item:hover .ufo-wrapper .window3) {
		animation: blink-window3 0.75s linear infinite;
	}

	:global(.mobile-nav a.nav-item.selected .ufo-wrapper .dome) {
		animation: dome-animation 0.75s ease-in-out 5 alternate;
	}

	:global(.mobile-nav a.nav-item.selected .ufo-wrapper .bottom-lines) {
		transform-origin: 10px 10px;
		animation: speed-lines 0.75s ease-in-out 5 alternate;
	}

	:global(.mobile-nav a.nav-item.selected .ufo-wrapper .window1) {
		animation: blink-window1 0.75s linear 5;
	}

	:global(.mobile-nav a.nav-item.selected .ufo-wrapper .window2) {
		animation: blink-window2 0.75s linear 5;
	}

	:global(.mobile-nav a.nav-item.selected .ufo-wrapper .window3) {
		animation: blink-window3 0.75s linear 5;
	}
</style>
