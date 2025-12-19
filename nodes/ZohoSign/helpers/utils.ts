import crypto from 'crypto';
import { BINARY_ENCODING, IExecuteFunctions, IHookFunctions, INode, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { apiRequest } from '../transport';

const map = new Map<string, string>([
    ["RequestSubmitted", "Sent"],
    ["RequestViewed", "Viewed"],
    ["RequestSigningSuccess", "Sign"],
    ["RequestCompleted", "Completed"],
    ["RequestRejected", "Declined"],
    ["RequestRecalled", "Recalled"],
    ["RequestForwarded", "Forward"],
    ["RequestExpired", "Expired"]
])


export function verifySigIfSet(
    hmacSecret: string,
    providedSignature: string, 
    verifyHmac: boolean, 
    hmacAlgo: string,
    rawBody: string
): boolean | string {
    if(!verifyHmac) return true;
    else {
        
        if(hmacSecret.trim() === "") {
            return "HMAC secret not set"
        }

        const mac = crypto.createHmac(hmacAlgo, hmacSecret);
        
        mac.update(rawBody, 'utf-8'); 

        const calculatedHmac = mac.digest('base64'); 

        if(providedSignature !== calculatedHmac) {
            return "validation failed"
        }

        return true;
    }
}

export async function getOrgId(this: IHookFunctions, node: INode): Promise<string> {
    const orgIdResponse: {
        organizations: {
        is_admin: boolean,
        org_id: string,
        is_default: boolean
    }[]
    } = await apiRequest.call(
        this, "GET", "organizations", {}, {}
    );
                    
    const orgId = orgIdResponse.organizations.find((val) => val.is_default)?.org_id

    if(!orgId) {
        throw new NodeOperationError(node, "Default OrgId cannot be found")
    }

    return orgId;
}

export function generateSecureSecretKey(): string {
    return crypto.randomBytes(24).toString('hex')
}

export function mapToScopesForWebhookCreation(topics: string[]): string {
    const finalScopeList = []

    for(let i = 0; i < topics.length; i++) {
        finalScopeList.push(
            map.get(topics[i])
        )
    }

    return finalScopeList.join(",")
}

export const UPLOAD_CHUNK_SIZE = 256 * 1024;

export async function getItemBinaryData(
	this: IExecuteFunctions,
	inputDataFieldName: string,
	i: number,
) {

	if (!inputDataFieldName) {
		throw new NodeOperationError(
			this.getNode(),
			'The name of the input field containing the binary file data must be set',
			{
				itemIndex: i,
			},
		);
	}
    
    const binaryData = this.helpers.assertBinaryData(i, inputDataFieldName);
	
    let fileContent: Buffer;
    let originalFilename: string | undefined;
    let mimeType;
    let contentLength: number;

    if(binaryData.id) {
        fileContent = await this.helpers.getBinaryDataBuffer(i, inputDataFieldName)
        const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
        originalFilename = metadata.fileName;
        contentLength = metadata.fileSize;
        mimeType = metadata.mimeType;
    } else {
        fileContent = Buffer.from(binaryData.data, BINARY_ENCODING)
        contentLength = fileContent.length;
        originalFilename = binaryData.fileName;
        mimeType = binaryData.mimeType
    }

	return {
		contentLength,
		fileContent,
		originalFilename,
		mimeType,
	};
}

export function checkWebActions(
    this: IHookFunctions,
    webhookActions: string,
    topics: string[]
): boolean {
    
    if(!webhookActions) return false

    const eventsSubbed = webhookActions.split(",")

    if(topics.length !== eventsSubbed.length) return false;

    for(let i = 0; i < topics.length; i++) {
        const topic = map.get(topics[i])
        if(!topic) throw new NodeOperationError(this.getNode(), "Invalid topic was subscribed previously, please delete and reinitialize the trigger node")
        if(topic in eventsSubbed) {
            continue
        } else {
            return false
        }
    }

    return true;
}

export async function deleteWebhook(
    this: IHookFunctions,
    webhookId: string
) {
    
    const responseData = await apiRequest.call(
        this,
        "DELETE",
        `accounts/webhooks/${webhookId}`,
        {}
    )

    if(responseData.code !== 0) {
        throw new NodeOperationError(
            this.getNode(),
            "Webhook cannot be deleted"
        )
    }

}

export type BinaryFileContent = {
    fileContent: Buffer<ArrayBufferLike>,
    originalFileName: string | undefined
}

export async function getAllBinaryDataPairedWithItem(this: IExecuteFunctions,items: INodeExecutionData[], itemIndex: number): Promise<BinaryFileContent[]> {
    const binaryFiles = items[itemIndex].binary || {}

    const foundBinaryFiles: BinaryFileContent[] = []
    
    for(const [fileName,] of Object.entries(binaryFiles)) {
        const { fileContent , originalFilename } = await getItemBinaryData.call(
                                                    this,
                                                    fileName,
                                                    itemIndex,
                                                );
        foundBinaryFiles.push({
            fileContent: fileContent,
            originalFileName: originalFilename
        })
    }

    return foundBinaryFiles
}