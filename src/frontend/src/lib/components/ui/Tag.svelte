<script lang="ts">
	export let ariaHidden = false;
</script>

<span aria-hidden={ariaHidden} class="rounded-md px-1.5 text-sm text-primary border border-primary bg-primary">
	<slot />
</span>
