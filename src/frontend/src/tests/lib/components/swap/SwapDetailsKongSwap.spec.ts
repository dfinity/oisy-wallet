import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { IcToken } from '$icp/types/ic-token';
import SwapDetailsKong from '$lib/components/swap/SwapDetailsKongSwap.svelte';
import { SwapProvider, type ProviderFee, type SwapMappedResult } from '$lib/types/swap';
import { render } from '@testing-library/svelte';

describe('SwapDetailsKong', () => {
	const baseProvider: SwapMappedResult = {
		provider: SwapProvider.KONG_SWAP,
		receiveAmount: 100_000_000n,
		slippage: 0.5,
		swapDetails: {} as SwapAmountsReply,
		route: [],
		liquidityFees: []
	};

	it('renders SwapRoute if route is non-empty', () => {
		const provider = {
			...baseProvider,
			route: ['icp', 'xyz']
		};

		const { container } = render(SwapDetailsKong, {
			props: { provider }
		});

		expect(container.innerHTML).toContain('route');
	});

	it('does not render SwapRoute if route is empty', () => {
		const provider = {
			...baseProvider,
			route: []
		};

		const { container } = render(SwapDetailsKong, {
			props: { provider }
		});

		expect(container.innerHTML).not.toContain('route');
	});

	it('renders SwapNetworkFee if networkFee is present', () => {
		const networkFee: ProviderFee = {
			fee: 3000n,
			token: { symbol: 'ICP', decimals: 8 } as IcToken
		};

		const provider = {
			...baseProvider,
			networkFee
		};

		const { container } = render(SwapDetailsKong, {
			props: { provider }
		});

		expect(container.innerHTML).toContain('network');
	});

	it('does not render SwapNetworkFee if networkFee is missing', () => {
		const provider = {
			...baseProvider,
			networkFee: undefined
		};

		const { container } = render(SwapDetailsKong, {
			props: { provider }
		});

		expect(container.innerHTML).not.toContain('network');
	});

	it('renders SwapLiquidityFees if liquidityFees is non-empty', () => {
		const liquidityFees: ProviderFee[] = [
			{
				fee: 3000n,
				token: { symbol: 'ICP', decimals: 8 } as IcToken
			}
		];

		const provider = {
			...baseProvider,
			liquidityFees
		};

		const { container } = render(SwapDetailsKong, {
			props: { provider }
		});

		expect(container.innerHTML).toContain('liquidity');
	});

	it('does not render SwapLiquidityFees if liquidityFees is empty', () => {
		const provider = {
			...baseProvider,
			liquidityFees: []
		};

		const { container } = render(SwapDetailsKong, {
			props: { provider }
		});

		expect(container.innerHTML).not.toContain('liquidity');
	});
});
