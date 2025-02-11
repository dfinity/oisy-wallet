<script lang="ts">
	export let styleClass: string | undefined = undefined;
</script>

<div class={`stretch ${styleClass ?? ''}`}>
	<slot />
</div>

<slot name="outer-content" />

<div
	class="bottom-0 left-0 px-3 pt-4 pb-4 md:px-6 md:pt-5 md:pb-6 sticky w-full border-t border-secondary bg-white"
>
	<slot name="toolbar" />
</div>
