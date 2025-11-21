import type { User } from '$declarations/ext_v2_token/ext_v2_token.did';
import type { Principal } from '@icp-sdk/core/principal';

/**
 * @link https://github.com/Toniq-Labs/ext-v2-token/blob/main/API-REFERENCE.md#user
 */
export const toUser = (principal: Principal): User => ({ principal });
