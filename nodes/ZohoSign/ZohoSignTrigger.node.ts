import {
    IDataObject,
    IHookFunctions,
    INodeType,
    INodeTypeDescription,
    IWebhookFunctions,
    IWebhookResponseData,
    jsonStringify,
    NodeConnectionTypes,
    NodeOperationError,
} from 'n8n-workflow';
import { ISignBody, ISignHeader } from './SignWebhookEvent';
import { checkWebActions, deleteWebhook, generateSecureSecretKey, getOrgId, mapToScopesForWebhookCreation, verifySigIfSet } from './helpers/utils';
import { apiRequest } from './transport';

export class ZohoSignTrigger implements INodeType {
    description: INodeTypeDescription = {
        
        displayName: "Zoho Sign Trigger",
        name: "zohoSignTrigger",
        icon:"file:sign_logo.svg",
        group: ['trigger'],
        version: 1,
        subtitle: "Receive webhook trigger events from the zoho sign app",
        description: "Triggers on incoming events",
        defaults: {
            name: "Zoho Sign Trigger"
        },
        usableAsTool: true,
        credentials: [
			{"name": 'zohoSignOAuth2Api', required: true}
		],
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        webhooks: [
            {
                name: 'default',
                httpMethod: 'POST',
                responseMode: "onReceived",
                path: 'webhook-zoho-sign'
            }
        ],
        properties: [
            {
                displayName: 'Zoho sign only supports two webhooks per account, consider having a single trigger that calls subworkflows from its branches refer more about events and what they mean here: https://help.zoho.com/portal/en/kb/zoho-sign/admin-guide/webhooks/articles/webhooks-management',
                name: "zohoSignTriggerNotice",
                type: "notice",
                default: ''
            },
            {
                displayName: 'Webhook HMAC Secret',
                name: 'webhook_hmac_sec',
                type: 'hidden',
                default: ''
            },
            {
                displayName: 'Webhook ID',
                name: 'webhook_id',
                type: 'hidden',
                default: ''
            },
            {
                displayName: 'HMAC Verification Enabled',
                name: "hmac_verify",
                type: "hidden",
                default: false
            },
            {
                displayName: 'Trigger on Event',
                name: "topics",
                type: 'multiOptions',
                default: [],
                options: [
                    {
                        name: "RequestCompleted", 
                        value: "RequestCompleted", 
                        description: 'When all the assigned signers or approvers completes the signing or approval process'
                    },
                    {
                        name: "RequestExpired",
                        value: "RequestExpired",
                        description: 'When a submitted document expires the allocated signing time'
                    },
                    {
                        name: "RequestForwarded",
                        description: 'When a submitted request is forwarded to another person by the assigned signer',
                        value: "RequestForwarded"
                    },
                    {
                        name: "RequestRecalled",
                        value: "RequestRecalled",
                        description: 'When a submitted signature request is recalled by the sender'
                    },
                    {
                        name: "RequestRejected",
                        value: "RequestRejected",
                        description: 'When a submitted signature request is rejected'
                    },
                    {
                        name: "RequestSigningSuccess",
                        value: "RequestSigningSuccess",
                        description: 'When one of the signers successfully completes the signing process'
                    },
                    {
                        name: "RequestSubmitted",
                        value: "RequestSubmitted",
                        description: 'When a document is submitted for signature'
                    },
                    {
                        name: "RequestViewed",
                        value: "RequestViewed",
                        description: 'When a submitted document is viewed'
                    },
                ],
                required: true
            }
        ],
    }

    async webhookCheckExists(this: IHookFunctions): Promise<boolean> {
        return false;
    }

    // Zoho Sign App has a limitation of only two webhooks per user account.

    webhookMethods = {
        default: {
            async checkExists(this: IHookFunctions): Promise<boolean> {                
                // const purpose = "n8n"

                const webhookUrl = this.getNodeWebhookUrl('default') as string;
                const triggerEvents = this.getNodeParameter('topics') as string[];

                const qs: IDataObject = {
                    'data': jsonStringify({"page_context":{"row_count":10,"start_index":1,"search_columns":{},"sort_column":"","sort_order":"DESC"}})
                };                
                
                const webhookResponse: {
                    code: number,
                    webhooks: {
                        environment: string,
                        webhook_url: string,
                        webhook_status: string,
                        purpose: string,
                        web_actions: string,
                        webhook_id: string
                    }[]
                } = await apiRequest.call(
                    this, "GET", "accounts/webhooks", {}, qs
                );

                if(webhookResponse.code === 0) {
                    const hook = webhookResponse.webhooks.find((val) => val.purpose === "n8n")
                    if(hook && hook.webhook_status === "Active" && hook.webhook_url === webhookUrl && checkWebActions.call(this, hook.web_actions, triggerEvents)) return true;
                    else if(hook && hook.webhook_url === webhookUrl && checkWebActions.call(this, hook.web_actions, triggerEvents)) throw new NodeOperationError(this.getNode(), "webhook for n8n already exists, please enable it under develop settings in zoho sign account");
                    else if(hook && hook.webhook_url === webhookUrl && hook.webhook_status === "Active") {
                        return false;
                    }
                    else return false;
                } else {
                    throw new NodeOperationError(
                        this.getNode(), "webhook checkExists method returned an invalid response"
                    )
                }                
            },

            async create(this: IHookFunctions): Promise<boolean> {

                const triggerEvents = this.getNodeParameter('topics') as string[];
                const webhookUrl = this.getNodeWebhookUrl('default') as string;
                
                const hmacSecret = generateSecureSecretKey();

                const webHookData = this.getWorkflowStaticData('node')
                webHookData.webhook_hmac_sec = hmacSecret

                const formData = new FormData()
                formData.append("webhook_url", webhookUrl)
                formData.append("purpose", "n8n")
                formData.append("webhook_actions", mapToScopesForWebhookCreation(triggerEvents))
                formData.append("environment", "PRODUCTION")
                formData.append("webhook_security_settings", jsonStringify(
                    {
                        hmac_security_info: {
                            secret_key: hmacSecret,
                        },
                        webhook_security_type: "HMAC"
                    }
                ))
                formData.append("org_id", await getOrgId.call(this, this.getNode()))

                const createdResponse = await apiRequest.call(
                    this, "POST", "accounts/webhooks", formData, {}, undefined, undefined, true
                )
                
                webHookData.webhook_id = createdResponse.webhook.webhook_id

                return (createdResponse.code === 0);
            },
            async delete(this: IHookFunctions): Promise<boolean> {

                const webHookData = this.getWorkflowStaticData('node')

                deleteWebhook.call(this, webHookData.webhook_id as string)

                return true;
            }
        }
    }

    async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
        
        const bodyData = this.getBodyData() as unknown as ISignBody;
        const headerData = this.getHeaderData() as unknown as ISignHeader;

        const hmacSecret = this.getNodeParameter("webhook_hmac_sec") as string;
        const verifyHmac = this.getNodeParameter("hmac_verify") as boolean

        const hmacAlgo = "sha256";
        const req = this.getRequestObject();
        const rawBody = (req).rawBody as string

        const res = verifySigIfSet(
            hmacSecret, headerData['x-zs-webhook-signature'], verifyHmac, hmacAlgo, rawBody
        );

        if(typeof(res) === "string") {
            throw new NodeOperationError(
                this.getNode(),
                res,
            )
        } else if(!res) {
            throw new NodeOperationError(
                this.getNode(),
                "Payload validation failed"
            )
        }

        const item: IDataObject = {
            receivedAt: new Date().toISOString(),
            headerData,
            bodyData
        }

        return {
            workflowData: [this.helpers.returnJsonArray([item])]
        }

    }
}