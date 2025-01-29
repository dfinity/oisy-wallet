import { QUICKNODE_API_KEY, QUICKNODE_API_URL } from '$env/rest/quicknode.env';
import type { TokenMetadata } from '$lib/types/token';
import type { UrlSchema } from '$lib/validation/url.validation';
import type { SplTokenAddress } from '$sol/types/spl';
import { z } from 'zod';

interface SplMetadataResponse {
	result: {
		content: {
			metadata: TokenMetadata;
			links: {
				image: z.infer<typeof UrlSchema>;
			};
		};
	};
}

/**
 * Get SPL token metadata.
 *
 * Documentation:
 * - https://www.quicknode.com/docs/solana/getAsset
 *
 */
export const splMetadata = ({
	tokenAddress
}: {
	tokenAddress: SplTokenAddress;
}): Promise<SplMetadataResponse> =>
	fetchQuicknodeApi<SplMetadataResponse>({
		body: {
			jsonrpc: '2.0',
			id: 1,
			method: 'getAsset',
			params: {
				id: tokenAddress
			}
		}
	});

const fetchQuicknodeApi = async <T>({
	body = {}
}: {
	body?: Record<string, unknown>;
}): Promise<T> => {
	const response = await fetch(`${QUICKNODE_API_URL}${QUICKNODE_API_KEY}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		throw new Error('QuickNode API response not ok.');
	}

	return response.json();
};
