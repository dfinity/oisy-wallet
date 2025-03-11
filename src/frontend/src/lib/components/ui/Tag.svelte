<script lang="ts">
	export let ariaHidden = false;
</script>

<span
	aria-hidden={ariaHidden}
	class="rounded-md border border-primary bg-primary px-1.5 text-sm text-primary"
>
	<slot />
</span>
