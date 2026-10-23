import { popupCenter } from '$lib/utils/window.utils';

describe('window.utils', () => {
	describe('popupCenter', () => {
		const size = { width: 400, height: 600 };

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('centres the popup on the top window', () => {
			vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
			vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);

			expect(popupCenter(size)).toContain(`width=400, height=600, top=${400 + screenY - 300}`);
			expect(popupCenter(size)).toContain(`left=${600 + screenX - 200}`);
		});

		it('centres on the browser window when the top window belongs to another origin', () => {
			const crossOriginTop = new Proxy(
				{},
				{
					get: () => {
						throw new DOMException('Blocked a frame from accessing a cross-origin frame.');
					}
				}
			);
			vi.spyOn(window, 'top', 'get').mockReturnValue(crossOriginTop as Window);
			vi.spyOn(window, 'outerWidth', 'get').mockReturnValue(1600);
			vi.spyOn(window, 'outerHeight', 'get').mockReturnValue(1000);

			const features = popupCenter(size);

			expect(features).toContain(`top=${500 + screenY - 300}`);
			expect(features).toContain(`left=${800 + screenX - 200}`);
		});
	});
});
