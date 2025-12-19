# Zoho Sign integration with n8n

Zoho Sign is a secure digital signature and workflow automation platform for businesses. Use this node to automate Zoho Sign operations directly from n8n workflows.

To learn more about Zoho Sign, visit our homepage, or contact sales with any questions.

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Credentials](#credentials)
- [Operations](#operations)
- [Compatibility](#compatibility)

## Prerequisites

- A Zoho Sign account
- n8n
- Access to OAuth 2.0 credentials (client ID and client secret)

## Installation

Follow the n8n community nodes installation guide to install the Zoho Sign node.

If you use n8n as a self-hosted user, you can install this node even if it doesn't appear in the default node list. Follow [GUI installation guide](https://docs.n8n.io/integrations/community-nodes/installation/gui-install/).

**Package name: @zohosign/n8n-nodes-sign**

## Credentials

To use the Zoho Sign node, you will need to authenticate via Zoho OAuth 2.0.

### Setting up OAuth 2.0

1. Visit [Zoho OAuth 2.0](https://www.zoho.com/accounts/protocol/oauth.html) and follow the instructions to generate a client ID and client secret. Select **Server-based Applications** as the client type.

2. Make sure to select the correct `Authorization URL` and `Access Token URL` depending on your Zoho Sign domain.

3. Enter the client ID and client secret in the credential page of the n8n node and click **Connect my account**.

4. Once connected, your Zoho Sign account is ready to use in workflows.

## Operations

The Zoho Sign node supports a range of document and template operations. Each operation listed below includes a link to its specific API documentation.

See all Zoho Sign [API documentation](https://www.zoho.com/sign/api/).

### Document operations

#### Get Many

Get all document requests in your account.

#### Get

Get a specific document request. 

Requires `Request ID` (found via Get Documents List operation or in the Zoho Sign UI URL for the specific request).

Optional boolean `Format Actions` helps to transform the request actions array for use in request `Update` operation by providing a generalized structure with placeholders.

#### Get Form Data

See form data from a completed document.

Requires `Request ID`.

#### Get Folder List

See all folders in your account.

#### Get Field Types

See all field types supported by Zoho Sign.

#### Get Document Types

See all document types in your account.

#### Download PDF

Download a request's data.

Requires `Request ID`.

#### Download Particular PDF File

Download a specific PDF file in the request data.

Requires `Request ID` and `Document ID`.

#### Download Completion Certificate

Download the completion certificate for a completed request.

Requires `Request ID`.

#### Recall

Recall a signing request.

Requires `Request ID`, `Reason (optional)`.

#### Remind Recipient

Send out a reminder email to recipients about a signing request.

Requries `Request ID`.

#### Create a New Folder

Create a new folder in your account.

Requires `Folder Name`.

#### Create New Document Type

Create a new document type for your account.

Requires `Document Type Name` and `Document Type Description (optional)`.

#### Update Document Type

Update the name and description of a document type.

Requires `Request Type ID`, `Document Category Name`, and `Document Category Description (optional)`.

#### Correct

Put a signing request in "CORRECTION" state so the admin can update it. Recipients cannot sign while the request is in this state. After making corrections, submit the request again to enable signing.

Requires `Request ID`.

#### Upload

Create a new request by uploading documents, or upload documents to a drafted request.

Requires `Request ID`.

#### Submit

Submit a document for signatures. This operation sends an email to all recipients to start the signing process. It will mark the document as "In progress" and prevent further editing unless the Correct Document operation is invoked with the request ID.

Requires `Request ID`.

#### Delete

Delete a request.

For a sent request, set `In Progress = true` to delete it. If not properly set, the request won't be deleted.

Requires `Request IDs to Delete` (a list of request IDs) and `In Progress` (Boolean field to indicate what type of document to delete).

```
{
	"data": ["38002000000070097", ...]
}
```

#### Extend

Change the expiration date for the signing request.

Requires `Request ID` and `Expire By`.

#### Update

Update the information regarding a signing request.

### Template Operations

#### Get Many

Get all templates in your account.

#### Get

Get information regarding a particular template.

Requires `Template ID`.

Optional boolean `Format Actions & Prefill fields` helps you to format the output for use in `Send For Signatures` operation by providing a generalized structure with placeholders.

#### Upload

Create a new template by uploading a document or upload documents to an existing template.

Requires `Template ID` (optional; will upload the document to the corresponding template).

#### Send For Signatures

Send a signing request using a template as a base.

Requires `Template ID`, `Is QuickSend` (Boolean that determines whether quick send or new document request draft), and `Prefill Fields` (optional; required if prefill fields are present in the document and you're using quick send).

#### Delete

Deletes a template.

Requires `Template ID`.

## Compatibility

This node is generally tested against and is compatible with the latest stable version of **n8n**. A minimum n8n version of **1.113.0** or higher is recommended.
