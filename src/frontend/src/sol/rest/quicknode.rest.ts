import {
	QUICKNODE_API_KEY,
	QUICKNODE_API_URL_DEVNET,
	QUICKNODE_API_URL_MAINNET
} from '$env/rest/quicknode.env';
import type { TokenMetadata } from '$lib/types/token';
import type { UrlSchema } from '$lib/validation/url.validation';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';
import type { z } from 'zod/v4';

interface QuicknodeApiError {
	error: {
		code: number;
		message: string;
	};
}

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
export const splMetadata = async ({
	tokenAddress,
	network
}: {
	tokenAddress: SplTokenAddress;
	network: SolanaNetworkType;
}): Promise<SplMetadataResponse | undefined> => {
	const metadata = await fetchQuicknodeApi<SplMetadataResponse>({
		body: {
			jsonrpc: '2.0',
			id: 1,
			method: 'getAsset',
			params: {
				id: tokenAddress
			}
		},
		network
	});

	if ('error' in metadata) {
		return;
	}

	return metadata;
};

const fetchQuicknodeApi = async <T>({
	body = {},
	network = 'mainnet'
}: {
	body?: Record<string, unknown>;
	network?: SolanaNetworkType;
}): Promise<T | QuicknodeApiError> => {
	const API_URL = network === 'devnet' ? QUICKNODE_API_URL_DEVNET : QUICKNODE_API_URL_MAINNET;

	const response = await fetch(`${API_URL}${QUICKNODE_API_KEY}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		throw new Error(`QuickNode API response not ok. Error: ${response}`);
	}

	return response.json();
};
