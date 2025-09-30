import { mount, unmount } from 'svelte';

type SvelteComponent<T = never> = new (options: { target: Element; props?: T }) => never;

type ComponentProps<T> = T extends new (options: { target: Element; props?: infer P }) => never
	? P
	: never;

export const componentToHtml = <T extends SvelteComponent>(
	{Component, props}:
	{Component: T,
		props?: ComponentProps<T>}
): string => {
	const container = document.createElement('div');

	try {
		const component = mount(Component, {
			target: container,
			props
		});

		const html = container.innerHTML;

		unmount(component);

		return html;
	} catch (error) {
		console.error('Error rendering component to HTML:', error);
		return '';
	} finally {
		container.remove();
	}
}