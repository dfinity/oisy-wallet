<script lang="ts">
	export let ariaHidden = false;
</script>

<span aria-hidden={ariaHidden} class="border-grey rounded-sm border px-0.5 text-sm">
	<slot />
</span>
