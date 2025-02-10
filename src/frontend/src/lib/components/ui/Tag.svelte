<script lang="ts">
	export let ariaHidden = false;
</script>

<span aria-hidden={ariaHidden} class="rounded-xs border border-grey px-0.5 text-sm">
	<slot />
</span>
