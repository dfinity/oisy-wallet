<script lang="ts">
	export let styleClass: string | undefined = undefined;
</script>

<div class={`stretch ${styleClass ?? ''}`}>
	<slot />
</div>

<slot name="outer-content" />

<div class="sticky bottom-0 left-0 w-full px-3 md:px-6 pb-4 md:pb-6 pt-4 md:pt-5 bg-white border-t border-secondary">
	<slot name="toolbar" />
</div>
