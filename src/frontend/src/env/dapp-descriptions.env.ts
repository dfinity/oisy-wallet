import dAppDescriptionsJson from '$env/dapp-descriptions.json';
import { OisyDappDescriptionSchema, type OisyDappDescription } from '$lib/types/dapp-description';
import * as z from 'zod/v4';

const parseResult = z.array(OisyDappDescriptionSchema).safeParse(dAppDescriptionsJson);
export const dAppDescriptions: OisyDappDescription[] = parseResult.success ? parseResult.data : [];
