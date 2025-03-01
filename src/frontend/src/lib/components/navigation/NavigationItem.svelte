<script lang="ts">
	export let href: string;
	export let selected = false;
	export let ariaLabel: string;
	export let testId: string | undefined = undefined;
</script>

<a {href} class="nav-item" class:selected aria-label={ariaLabel} data-tid={testId}>
	<slot />
</a>
