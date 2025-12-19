import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	"ZohoSign.documents.ALL",
	"ZohoSign.templates.ALL",
	"ZohoSign.account.ALL",
]

export class ZohoSignOAuth2Api implements ICredentialType {
	name = 'zohoSignOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Zoho Sign OAuth2 API';

	documentationUrl = 'https://www.zoho.com/sign/api/';

	icon: Icon = "file:sign_logo.svg"

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'options',
			options: [
				{
					name: 'US DC',
					value: 'https://accounts.zoho.com/oauth/v2/auth',
					description: 'For the US domain',
				},
				{
					name: 'IN DC',
					value: 'https://accounts.zoho.in/oauth/v2/auth',
					description: 'For the IN domain',
				},
				{
					name: 'CA DC',
					value: 'https://accounts.zohocloud.ca/oauth/v2/auth',
					description: 'For the CA domain',
				},
				{
					name: "EU DC",
					value: 'https://accounts.zoho.eu/oauth/v2/auth',
					description: 'For the EU domain',
				},
				{
					name: "JP DC",
					value: 'https://accounts.zoho.jp/oauth/v2/auth',
					description: 'For the JP domain',
				},
				{
					name: "AU DC",
					value: 'https://accounts.zoho.com.au/oauth/v2/auth',
					description: 'For the AU domain',
				},
			],
			default: 'https://accounts.zoho.com/oauth/v2/auth',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'options',
			options: [
				{
					name: 'CA - https://accounts.zohocloud.ca/oauth/v2/token',
					value: 'https://accounts.zohocloud.ca/oauth/v2/token',
				},
				{
					name: 'IN - https://accounts.zoho.in/oauth/v2/token',
					value: 'https://accounts.zoho.in/oauth/v2/token',
				},
				{
					name: 'US - https://accounts.zoho.com/oauth/v2/token',
					value: 'https://accounts.zoho.com/oauth/v2/token',
				},
				{
					name: "EU - https://accounts.zoho.eu/oauth/v2/token",
					value: 'https://accounts.zoho.eu/oauth/v2/token',
				},
				{
					name: "JP - https://accounts.zoho.jp/oauth/v2/token",
					value: 'https://accounts.zoho.jp/oauth/v2/token',
				},
				{
					name: "AU - https://accounts.zoho.com.au/oauth/v2/token",
					value: 'https://accounts.zoho.com.au/oauth/v2/token',
				},
			],
			default: 'https://accounts.zoho.com/oauth/v2/token',
			required: true
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'access_type=offline&prompt=consent',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: `${scopes.join(' ')}`,
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
