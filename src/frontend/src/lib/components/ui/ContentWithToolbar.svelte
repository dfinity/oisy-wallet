<script lang="ts">
	export let styleClass: string | undefined = undefined;
</script>

<div class={`stretch ${styleClass ?? ''}`}>
	<slot />
</div>

<slot name="outer-content" />

<div class="toolbar">
	<slot name="toolbar" />
</div>
