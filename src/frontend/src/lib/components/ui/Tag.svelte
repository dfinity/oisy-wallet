<script lang="ts">
	export let ariaHidden = false;
</script>

<span aria-hidden={ariaHidden} class="rounded-xs px-0.5 text-sm border border-grey">
	<slot />
</span>
