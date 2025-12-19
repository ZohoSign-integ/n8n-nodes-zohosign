import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IPollFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IWebhookFunctions,
} from 'n8n-workflow';

import { NodeOperationError } from 'n8n-workflow';

export function throwOnErrorStatus(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IPollFunctions,
	responseData: {
		data?: Array<{ status: string; message: string }>;
	},
) {
	if (responseData?.data?.[0].status === 'error') {
		throw new NodeOperationError(this.getNode(), responseData as Error);
	}
}

export async function getDomain(this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions | IHookFunctions | IWebhookFunctions) {
	const credentials = await this.getCredentials('zohoSignOAuth2Api');
	const accessTokenUrl = credentials.accessTokenUrl as string || '';
	
    let domain = 'zoho.com'; // default
	
	if (accessTokenUrl.includes('zoho.in')) {
		domain = 'zoho.in';
	} else if (accessTokenUrl.includes('zohocloud.ca')) {
		domain = 'zohocloud.ca';
	} else if (accessTokenUrl.includes('zoho.com')) {
		domain = 'zoho.com';
	} else if(accessTokenUrl.includes('zoho.eu')) {
		domain = 'zoho.eu';
	} else if(accessTokenUrl.includes('zoho.jp')) {
		domain = 'zoho.jp'
	} else if(accessTokenUrl.includes('zoho.com.au')) {
		domain = 'zoho.com.au'
	}

	return domain;
}

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions | IWebhookFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | FormData,
	query?: IDataObject,
	uri?: string,
	option: IDataObject = {},
	is_form: boolean = false
) {
	
	query = query || {};
	let headers = {}
	if(is_form) {
		headers = {
			"Content-Type": "application/x-www-form-urlencoded"
		}
	}

	const domain = await getDomain.call(this);

	const options: IHttpRequestOptions = {
		headers: headers,
		method,
		body,
		qs: query,
		url: uri || `https://sign.${domain}/api/v1/${endpoint}`,
		json: is_form ? false : true
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	if (Object.keys(body).length === 0 && !is_form) {
		delete options.body;
	}

	return await this.helpers.httpRequestWithAuthentication.call(this, 'zohoSignOAuth2Api', options);
}