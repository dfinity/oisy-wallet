<script lang="ts">
	import ETHIcon from '$lib/components/icons/ETHIcon.svelte';
</script>

<article class="bg-deep-violet text-ghost-white rounded-lg py-8 my-4 relative">
	<div class="absolute" style="top: -3rem; left: 1rem;">
		<ETHIcon />
	</div>

	<slot />
</article>
