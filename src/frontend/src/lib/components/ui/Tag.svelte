<script lang="ts">
	export let ariaHidden = false;
</script>

<span
	aria-hidden={ariaHidden}
	class="rounded-md px-1.5 text-sm border border-primary bg-primary text-primary"
>
	<slot />
</span>
