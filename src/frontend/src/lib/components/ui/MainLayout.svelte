<main class="relative mx-auto max-w-screen-2.5xl pt-8 sm:flex sm:flex-row">
	<div class="hidden min-w-0 sm:relative sm:block sm:min-w-44">
		<slot name="menu" />
	</div>

	<div class="mx-auto max-w-screen-sm sm:w-3/4">
		<slot />
	</div>

	<div class="hidden lg:relative lg:block lg:min-w-44"></div>
</main>
