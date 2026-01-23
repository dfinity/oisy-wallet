import { loadCustomTokens as loadErc1155CustomTokens } from '$eth/services/erc1155.services';
import { loadCustomTokens as loadErc20CustomTokens } from '$eth/services/erc20.services';
import { loadCustomTokens as loadErc721CustomTokens } from '$eth/services/erc721.services';
import { loadCustomTokens as loadExtCustomTokens } from '$icp/services/ext.services';
import { loadCustomTokens as loadIcPunksCustomTokens } from '$icp/services/icpunks.services';
import { loadCustomTokens as loadIcrcCustomTokens } from '$icp/services/icrc.services';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import type { OptionIdentity } from '$lib/types/identity';
import { loadCustomTokens as loadSplCustomTokens } from '$sol/services/spl.services';
import { isNullish, queryAndUpdate } from '@dfinity/utils';
import type { CustomToken } from '$declarations/backend/backend.did';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';

export const loadCustomTokens = async ({
    identity,
    ...rest
}: {
    identity: OptionIdentity;
} & Omit<LoadCustomTokenParams, 'identity' | 'filterTokens' | 'certified' | 'tokens'>): Promise<void> => {
    if (isNullish(identity)) {
        return;
    }

    await queryAndUpdate<CustomToken[]>({
        request: ({ certified }) =>
            loadNetworkCustomTokens({
                identity,
                certified,
                ...rest
            }),
        onLoad: async ({ response: tokens, certified }) => {
            const icrcTokens: CustomToken[] = [];
            const erc20Tokens: CustomToken[] = [];
            const erc721Tokens: CustomToken[] = [];
            const erc1155Tokens: CustomToken[] = [];
            const splTokens: CustomToken[] = [];
            const extTokens: CustomToken[] = [];
            const icPunksTokens: CustomToken[] = [];

            tokens.forEach((token) => {
                if ('Icrc' in token.token) {
                    icrcTokens.push(token);
                } else if ('Erc20' in token.token) {
                    erc20Tokens.push(token);
                } else if ('Erc721' in token.token) {
                    erc721Tokens.push(token);
                } else if ('Erc1155' in token.token) {
                    erc1155Tokens.push(token);
                } else if ('SplMainnet' in token.token || 'SplDevnet' in token.token) {
                    splTokens.push(token);
                } else if ('ExtV2' in token.token) {
                    extTokens.push(token);
                } else if ('IcPunks' in token.token) {
                    icPunksTokens.push(token);
                }
            });

            await Promise.all([
                loadIcrcCustomTokens({ identity, certified, tokens: icrcTokens }),
                loadErc20CustomTokens({ identity, certified, tokens: erc20Tokens }),
                loadErc721CustomTokens({ identity, certified, tokens: erc721Tokens }),
                loadErc1155CustomTokens({ identity, certified, tokens: erc1155Tokens }),
                loadSplCustomTokens({ identity, certified, tokens: splTokens }),
                loadExtCustomTokens({ identity, certified, tokens: extTokens }),
                loadIcPunksCustomTokens({ identity, certified, tokens: icPunksTokens })
            ]);
        },
        onUpdateError: () => {
            // Errors are handled standard by standard
        },
        identity
    });
};
