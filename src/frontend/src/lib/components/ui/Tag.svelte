<script lang="ts">
	export let ariaHidden = false;
</script>

<span
	aria-hidden={ariaHidden ? 'true' : 'false'}
	class="rounded-sm border border-grey px-0.5 text-sm"
>
	<slot />
</span>
