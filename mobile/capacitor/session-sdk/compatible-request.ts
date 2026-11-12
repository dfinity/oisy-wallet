import {
	Endpoint,
	Expiry,
	ReadRequestType,
	SubmitRequestType,
	type HttpAgentRequest,
	type Nonce
} from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

interface CommonBody {
	sender: Uint8Array | { toUint8Array(): Uint8Array };
	ingress_expiry: { toJSON(): { __expiry__: string } };
}
type Body = CommonBody &
	(
		| { request_type: 'read_state'; paths: Uint8Array[][] }
		| {
				request_type: 'call' | 'query';
				canister_id: { toUint8Array(): Uint8Array };
				method_name: string;
				arg: Uint8Array;
				nonce?: Uint8Array;
		  }
	);

/** Convert public wire values, not private SDK class instances. Preserve the signed expiry exactly. */
export const compatibleRequest = (input: {
	endpoint: 'call' | 'read' | 'read_state';
	request: RequestInit;
	body: Body;
}): HttpAgentRequest => {
	const { body } = input;
	const common = {
		sender:
			body.sender instanceof Uint8Array
				? body.sender
				: Principal.fromUint8Array(body.sender.toUint8Array()),
		ingress_expiry: Expiry.fromJSON(JSON.stringify(body.ingress_expiry.toJSON()))
	};
	if (body.request_type === 'read_state') {
		return {
			endpoint: Endpoint.ReadState,
			request: input.request,
			body: { ...common, request_type: ReadRequestType.ReadState, paths: body.paths }
		};
	}
	const call = {
		...common,
		canister_id: Principal.fromUint8Array(body.canister_id.toUint8Array()),
		method_name: body.method_name,
		arg: body.arg,
		...(body.nonce !== undefined && { nonce: body.nonce as Nonce })
	};
	return body.request_type === 'call'
		? {
				endpoint: Endpoint.Call,
				request: input.request,
				body: { ...call, request_type: SubmitRequestType.Call }
			}
		: {
				endpoint: Endpoint.Query,
				request: input.request,
				body: { ...call, request_type: ReadRequestType.Query }
			};
};
