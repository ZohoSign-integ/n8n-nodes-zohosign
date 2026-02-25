import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { jsonParse, jsonStringify, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { apiRequest, getDomain } from './transport';
import { getAllBinaryDataPairedWithItem } from './helpers/utils';
import { listSearch } from './methods';
import { formatFields, formatTemplateActions, formatTemplatePrefillFieldsBooleanData, formatTemplatePrefillFieldsCheckboxGroupData, formatTemplatePrefillFieldsDateData, formatTemplatePrefillFieldsRadioData, formatTemplatePrefillFieldsTextData } from './helpers/redacters';

const notices: INodeProperties[] = [
	{
		displayName: 'Notice: Request ID should be of a document of status completed otherwise, view access will be denied.',
		type: "notice",
		name: "getFormDataNotice",
		default: "",
		displayOptions: {
			show: {
				resource: ["document"],
				operation: [
					"getDocumentFormData"
				]
			}
		}
	},
	{
		displayName: "Notice: This API can return files compressed as a zip or single PDF depending on the combination of node parameters and the number of documents saved under the request. Certificate of Completion will only be attached to requests that are with status completed.",
		type: "notice",
		name: "downloadPdfNotice",
		default: "",
		displayOptions: {
			show: {
				resource: ["document"],
				operation: [
					"downloadPDF"
				]
			}
		}
	},
	{
		displayName: "Notice: If a request hasn't been signed yet by all recipients, then you cannot download certificate of completion for the same, therefore an error will be raised for such executions.",
		type: "notice",
		name: "downloadCOCNotice",
		default: "",
		displayOptions: {
			show: {
				resource: ["document"],
				operation: [
					"downloadCompletionCertificate"
				]
			}
		}
	},
	{
		displayName: "Notice: If In Progress is false then, requests that are in progress will not be deleted. Set it to true to delete requests that are in progress as well.",
		type: "notice",
		name: "deleteDocumentNotice",
		default: "",
		displayOptions: {
			show: {
				resource: ["document"],
				operation: [
					"deleteDocument"
				]
			}
		}
	},
	{
		displayName: "Notice: This action will mark the submitted request as being corrected and therefore no recipients can sign the document until you submit the request again.",
		type: "notice",
		default: "",
		name: "correctDocumentNotice",
		displayOptions: {
			show: {
				resource: ["document"],
				operation: [
					"correctDocument"
				]
			}
		}
	},
	{
		displayName: 'Notice: A request ID is not mandatory but, if given then all binary files paired with each item will be uploaded to the same request, if not given then a new request ID will be created with all binary files for each item.',
		type: "notice",
		default: "",
		name: "createDocumentNotice",
		displayOptions: {
			show: {
				resource: ["document"],
				operation: [
					"createDocument"
				]
			}
		}
	},
	{
		displayName: 'Notice: Submits the request (and the documents uploaded with recipient information) for signatures. If you want to edit information within the request, then use `Update` operation to update the request before submitting.',
		type: "notice",
		default: "",
		name: "submitDocumentNotice",
		displayOptions: {
			show: {
				resource: ["document"],
				operation: [
					"submitDocument"
				]
			}
		}
	},
	{
		displayName: "Notice: A template ID is not needed but, if given the documents will be uploaded to the same template, if not then a new template ID will be created.",
		type: "notice",
		default: "",
		name: "createTemplateNotice",
		displayOptions: {
			show: {
				resource: ["template"],
				operation: [
					"createTemplate"
				]
			}
		}
	},
	{
		displayName: "Notice: If QuickSend is false, then you can use the request ID in the response to further update information regarding the request before submitting for signatures.",
		type: "notice",
		default: "",
		name: "submitTemplateNotice",
		displayOptions: {
			show: {
				resource: [
					"template"
				],
				operation: [
					"submitTemplate"
				]
			}
		}
	}
]

export class ZohoSign implements INodeType {

	methods = { listSearch }

	description: INodeTypeDescription = {
		displayName: 'Zoho Sign',
		name: 'zohoSign',
		icon: 'file:sign_logo.svg',
		group: ['input'],
		version: 1,
		description: 'Interact with the Zoho Sign API',
		defaults: {
			name: 'Zoho Sign',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{"name": 'zohoSignOAuth2Api', required: true}
		],
		usableAsTool: true,
		properties: [
			{
				"displayName": "Resource",
				"name": "resource",
				"type": "options",
				"required": true,
				"options": [
					{name: "Document", value: "document"},
					{name: "Template", value: "template"}
				],
				default: ""
			},
			{
				"displayName": "Operation",
				"name": "operation",
				"type": "options",
				"required": true,
				"options": [

					// =======
					// GET
					// =======

					{name: 'Get Many', value: "getDocumentsList", description: "This will help you to fetch the list of documents in your account", action: "Get Many"},
					{name: 'Get', value: "getDetailsParticularDocument", description: 'This retrieves the details of the document including the status of the document. Use the key “request_status” to check for document completion.', action: 'Get'},
					{name: 'Get Form Data', value: "getDocumentFormData", description: "Retrieves the filled field data for a particular document", action: 'Get Form Data'},
					{name: 'Get Folder List', value: "getFolderList", description: "This will fetch the list of folders in your account", action: 'Get Folder List'},
					{name: 'Get Field Types', value: "retrieveFieldTypes", description: "This will help you to retrieve field types", action: 'Get Field Types'},
					{name: 'Get Document Types', value: "getDocumentTypes", description: "This will help you to find the document types in your account", action: 'Get Document Types'},
					{name: 'Download PDF', value: "downloadPDF", description: "Retrieves the PDF content that can be downloaded", action: 'Download PDF'},
					{name: 'Download Particular PDF File', value: "downloadParticularPdfFile", description: "Retrieves the PDF content of a particular file", action: 'Download Particular PDF File'},
					{name: "Download Completion Certificate", value: "downloadCompletionCertificate", description: "Retrieves the completion certificate PDF content", action: 'Download Completion Certificate'},

					// =======
					// POST
					// =======

					{name: 'Recall', value: "recallDocument", description: "Recalling a request cancels the signing process. Once you recall a request, recipients can no longer view or sign it. You can recall a request if you send an incorrect document, or if you send it to an incorrect email address", action: 'Recall'},
					{name: "Remind Recipient", value: "remindRecipient", description: "A reminder is sent to the recipients who need to sign", action: 'Remind Recipient'},
					{name: "Create a New Folder", value: "createNewFolder", description: "This will help you to create a new folder", action: 'Create a New Folder'},
					{name: 'Create New Document Type', value: "createNewDocumentType", description: "This will help you to create a new document type", action: 'Create New Document Type'},
					{name: "Update Document Type", value: "updateDocumentType", description: "This will help you to update an existing document type", action: 'Update Document Type'},
					{name: "Correct", value: "correctDocument", description: "This will help you to mark a request, that has been submitted for signatures, as status = correction, so you can edit information of the sent request", action: 'Correct'},
					{name: "Upload", value: "createDocument", description: "This will create/upload a document", action: 'Upload'},
					{name: "Submit", value: "submitDocument", description: "This will help you to send a request to your recipients for signing", action: 'Submit'},

					// =======
					// PUT
					// =======

					{name: "Delete", value: "deleteDocument", description: "Deleting a document moves it to trash", action: 'Delete'},
					{name: "Extend", value: "extendDocument", description: "This will help you to extend the expiration date of the request signing link", action: 'Extend'},
					{name: "Update", value: "updateDocument", description: "This will help you to update information regarding a request", action: 'Update'}

				],
				displayOptions: {
					show: {
						resource: ["document"],
					}
				},
				default: "getDocumentsList"
			},
			{
				"displayName": "Operation",
				"name": "operation",
				"type": "options",
				"required": true,
				"options": [

					// =======
					// GET
					// =======

					{name: 'Get Many', value: "getTemplatesList", description: "This will help you to fetch the list of templates in your account", action: 'Get Many'},
					{name: "Get", value: "getTemplateDetails", description: 'Get the details of a particular template using its ID', action: 'Get'},

					// =======
					// POST
					// =======

					{name: "Upload", value: "createTemplate", description: "Upload a document or documents as a template", action: 'Upload'},
					{name: "Send For Signatures", value: "submitTemplate", description: "Use a template to send a request for signing to the recipients", action: 'Send For Signatures'},

					// =======
					// PUT
					// =======

					{name: "Delete", value: "deleteTemplate", description: "Deleting a template moves it to trash", action: 'Delete'},

				],
				displayOptions: {
					show: {
						resource: ["template"],
					}
				},
				default: "getTemplatesList"
			},
			...notices,

			//================================
			// FIELDS 
			//================================

			{
				displayName: 'Request Name',
				name: "request_name",
				type: "string",
				default: '',
				displayOptions: {
					show: {
						resource: [
							"document",
						],
						operation: [
							"updateDocument",
						]
					}
				},
				description: 'Name to be given to the signature request'
			},
			{
				displayName: 'Request Name',
				name: "request_name_template",
				type: "string",
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							"template"
						],
						operation: [
							"submitTemplate"
						]
					}
				},
				description: 'Name to be given to the signature request'
			},
			{
				displayName: 'Request ID',
				name: "request_id",
				type: "string",
				required: true,
				default: '',
				description: "Request ID associated with a document signing request",
				displayOptions: {
					show: {
						resource: ["document"],
						operation: [
							"getDetailsParticularDocument",
							"getDocumentFormData",
							"downloadPDF",
							"downloadParticularPdfFile",
							"downloadCompletionCertificate",
							"recallDocument",
							"remindRecipient",
							"extendDocument",
							"correctDocument",
							"submitDocument",
							"updateDocument"
						]
					}
				}
			},
			{
				displayName: "Request ID",
				name: "create_document_request_id",
				type: "string",
				default: "",
				displayOptions: {
					show: {
						resource: ["document"],
						operation: [
							"createDocument"
						]
					}
				}
			},
			{
				displayName: "Template ID",
				name: "template_id",
				type: "string",
				default: "",
				required: true,
				displayOptions: {
					show: {
						resource: [
							"template"
						],
						operation: [
							"getTemplateDetails",
							"deleteTemplate",
						]
					}
				}
			},
			{
				displayName: "Select Template",
				name: "template_submit",
				type: "resourceLocator",
				default: {mode: 'list', value: ''},
				required: true,
				description: "The template you want to send with",
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'templateSearch'
						},
					}, 
					{
						displayName: "By ID",
						name: "template_id",
						type: "string"
					}
				],
				displayOptions: {
					show: {
						resource: [
							"template"
						],
						operation: [
							"submitTemplate"
						]
					}
				}
			},
			{
				displayName: "Template ID",
				name: "template_id_create_template",
				type: "string",
				default: "",
				displayOptions: {
					show: {
						resource: [
							"template"
						],
						operation: [
							"createTemplate"
						]
					}
				}
			},
			{
				displayName: 'Document ID',
				name: "document_id",
				type: "string",
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ["document"],
						operation: [
							"downloadParticularPdfFile"
						]
					}
				}
			},
			{
				displayName: 'Select Request Type ID',
				name: "request_type_id",
				type: "resourceLocator",
				required: true,
				default: {mode: 'list', value: ''},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'requestTypeSearch'
						},
					}, 
					{
						displayName: "By ID",
						name: "id",
						type: "string"
					}
				],
				displayOptions: {
					show: {
						resource: ["document"],
						operation: [
							"updateDocumentType",
							"updateDocument"
						]
					}
				},
				description: 'Document category ID'
			},
			{
				displayName: 'Document Category Name',
				name: "request_type_name",
				required: true,
				type: "string",
				default: "",
				displayOptions: {
					show: {
						resource: [
							"document"
						],
						operation: [
							"createNewDocumentType",
							"updateDocumentType"
						]
					}
				}
			},
			{
				displayName: 'Document Category Description',
				name: "request_type_description",
				type: "string",
				default: "",
				displayOptions: {
					show: {
						resource: [
							"document"
						],
						operation: [
							"createNewDocumentType",
							"updateDocumentType"
						]
					}
				}
			},
			{
				displayName: 'Notes',
				name: "notes",
				type: "string",
				default: '',
				displayOptions: {
					show: {
						resource: [
							"document",
							"template"
						],
						operation: [
							"updateDocument",
							"submitTemplate"
						]
					}
				},
				description: "Message to be sent to all recipients in common"
			},
			{
				displayName: 'Expiration Days',
				name: "expiration_days",
				type: "number",
				default: 0,
				displayOptions: {
					show: {
						resource: ["document"],
						operation: [
							"updateDocument"
						]
					}
				},
				description: 'No of days after which the document will expire'
			},
			{
				displayName: 'Is Sequential',
				name: "is_sequential",
				type: "boolean",
				required: true,
				default: true,
				displayOptions: {
					show: {
						resource: ["document"],
						operation: [
							"updateDocument"
						]
					}
				},
				description: "Whether Sequential signing / Parallel Signing [true/false]"
			},
			{
				displayName: 'Email Remainder',
				name: "email_reminders",
				type: "boolean",
				default: true,
				description: "Whether to send automatic reminders",
				displayOptions: {
					show: {
						resource: ["document"],
						operation: [
							"updateDocument"
						]
					}
				}
			},
			{
				displayName: 'Remainder Period',
				name: "reminder_period",
				type: "number",
				default: 5,
				displayOptions: {
					show: {
						resource: ["document"],
						operation: [
							"updateDocument"
						]
					}
				},
				description: "Send automatic reminders once in [n] days"
			},
			{
				displayName: 'Folder ID',
				name: "folder_id",
				type: "string",
				default: '',
				displayOptions: {
					show: {
						resource: ["document"],
						operation: [
							"updateDocument"
						]
					}
				},
				description: "Folder"
			},
			{
				displayName: "Folder Name",
				name: "folder_name",
				type: "string",
				required: true,
				default: "",
				displayOptions: {
					show: {
						resource: ["document"],
						operation: [
							"createNewFolder"
						]
					}
				}
			},
			// {
			// 	displayName: "Input DataField Name",
			// 	name: "inputDataFieldName",
			// 	default: "",
			// 	required: true,
			// 	type: "string",
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				"template"
			// 			],
			// 			operation: [
			// 				"createTemplate"
			// 			]
			// 		}
			// 	}
			// },
			{
				displayName: 'Download with Certificate of Completion',
				name: "with_coc",
				type: "boolean",
				default: false,
				displayOptions: {
					show: {
						resource: ["document"],
						operation: [
							"downloadPDF"
						]
					}
				}
			},
			{
				displayName: 'Merge All Documents',
				name: "merge",
				type: "boolean",
				default: false,
				displayOptions: {
					show: {
						resource: ["document"],
						operation: [
							"downloadPDF"
						]
					}
				}
			},
			{
				displayName: 'Password',
				name: "password",
				type: "string",
				typeOptions: { password: true },
				default: "",
				displayOptions: {
					show: {
						resource: ["document"],
						operation: [
							"downloadPDF"
						]
					}
				}
			},
			{
				displayName: "Return All",
				name: "return_all",
				type: "boolean",
				default: false,
				displayOptions: {
					show: {
						resource: [
							"document",
							"template"
						],
						operation: [
							"getDocumentsList",
							"getTemplatesList"
						]
					}
				},
				description: 'Whether to return all data from the sign account without pagination'
			},
			{
				displayName: "Reason",
				name: "reason",
				type: "string",
				default: "recalled",
				required: true,
				displayOptions: {
					show: {
						resource: [
							"document"
						],
						operation: [
							"recallDocument"
						]
					}
				}
			},
			{
				displayName: 'Request IDs to Delete',
				name: "request_ids_list",
				type: "json",
				description: "Replace [] with your list of request IDs, make sure the IDs in the list are proper string eg, [\"38002000000062395\"]",
				default: `
{
	"data": [] 
}
				`,
				required: true,
				displayOptions: {
					show: {
						resource: [
							"document"
						],
						operation: [
							"deleteDocument"
						],
					}
				}
			},
			{
				displayName: "In Progress",
				description: 'Whether to delete requests with in progress status',
				name: "recall_inprogress",
				type: "boolean",
				default: false,
				required: true,
				displayOptions: {
					show: {
						resource: [
							"document"
						],
						operation: [
							"deleteDocument"
						],
					}
				}
			},
			{
				displayName: "Reason",
				name: "deleted_reason",
				type: "string",
				default: "deleted",
				required: true,
				displayOptions: {
					show: {
						resource: [
							"document"
						],
						operation: [
							"deleteDocument"
						],
						recall_inprogress: [true]
					}
				}
			},
			{
				displayName: 'Expire By',
				name: "expire_by",
				type: "dateTime",
				default: "",
				required: true,
				displayOptions: {
					show: {
						resource: [
							"document"
						],
						operation: [
							"extendDocument"
						],
					}
				}
			},
			{
				displayName: "Is QuickSend",
				name: "is_quicksend",
				type: "boolean",
				default: true,
				required: true,
				displayOptions: {
					show: {
						resource: [
							"template"
						],
						operation: [
							"submitTemplate"
						]
					}
				}
			},
			{
				displayName: 'Prefill Fields',
				name: "prefill_fields",
				type: "boolean",
				default: false,
				required: true,
				description: "Whether to include any prefill fields if any in the template documents",
				displayOptions: {
					show: {
						resource: [
							"template"
						],
						operation: [
							"submitTemplate"
						]
					}
				}
			},
			{
				displayName: 'Prefill Fields Json',
				name: "prefill_fields_json",
				type: "json",
				default: 
`{
	"field_data": {
		"field_text_data": {
				
		},
		"field_boolean_data": {
				
		},
		"field_date_data": {
				
		},
		"field_radio_data": {
				
		},
		"field_checkboxgroup_data": {
				
		}
	}
}`,
				displayOptions: {
					show: {
						prefill_fields: [true]
					}
				}
			},
			{
				displayName: "Simplify Output",
				name: "simplify_output",
				type: "boolean",
				required: true,
				default: true,
				description: "Whether to limit output data or return everything",
				displayOptions: {
					show: {
						resource: [
							"document",
							"template"
						],
						operation: [
							"getDetailsParticularDocument",
							"getDocumentsList",
							"createDocument",
							"submitDocument",
							"updateDocument",
							"getTemplatesList",
							"getTemplateDetails",
							"createTemplate",
							"submitTemplate"
						]
					}
				}
			},
			{
				displayName: "Format Actions",
				name: "format_actions_document",
				type: "boolean",
				required: true,
				default: false,
				description: "Whether to format actions in a way for use in 'Update' operation",
				displayOptions: {
					show: {
						resource: [
							"document",
						],
						operation: [
							"getDetailsParticularDocument",
						]
					}
				}
			},
			{
				displayName: "Format Actions & Prefill Fields",
				name: "format_actions_template",
				type: "boolean",
				required: true,
				default: false,
				description: "Whether to format actions & prefill fields in a way for use in 'Send For Signatures' operation",
				displayOptions: {
					show: {
						resource: [
							"template",
						],
						operation: [
							"getTemplateDetails",
						]
					}
				}
			},
			{
				displayName: "Page Context",
				name: "page_context",
				type: "fixedCollection",
				required: true,
				typeOptions: {
					maxValue: 1,
					minValue: 1,
					multipleValues: true
				},
				default: {
					values: [
						{
							row_count: 10,
							start_index: 1,
							sort_column: 'created_time',
							sort_order: 'DESC',
							search_columns: {}
						}
					]
				},
				displayOptions: {
					show: {
						resource: [
							"document"
						],
						operation: [
							"getDocumentsList"
						]
					}
				},
				options: [
					{
						displayName: "Values",
						name: "values",
						values: [
							{
								displayName: 'Row Count',
								name: 'row_count',
								required:	true,
								type: 'number',
								default: 10,
								description: 'If return all is true then this field won\'t have any effect'
							},
							{
								displayName: 'Search Columns',
								name: 'search_columns',
								type: 'collection',
								default: {},
								options: [
									{
										displayName: 'Folder Name',
										name: 'folder_name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Form Name',
										name: 'form_name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Owner Full Name',
										name: 'owner_full_name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Recipient Email',
										name: 'recipient_email',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Recipient Name',
										name: 'recipient_name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Request Name',
										name: 'request_name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Template Name',
										name: 'template_name',
										type: 'string',
										default: '',
									},
								]
							},
							{
								displayName: 'Sort Column',
								name: 'sort_column',
								required:	true,
								type: 'options',
								default: 'created_time',
								options: [
									{
										name: 'Created Time',
										value: 'created_time',
									},
									{
										name: 'Folder Name',
										value: 'folder_name',
									},
									{
										name: 'Form Name',
										value: 'form_name',
									},
									{
										name: 'Owner Full Name',
										value: 'owner_full_name',
									},
									{
										name: 'Recipient Email',
										value: 'recipient_email',
									},
									{
										name: 'Request Name',
										value: 'request_name',
									},
								]
							},
							{
								displayName: 'Sort Order',
								name: 'sort_order',
									required:	true,
								type: 'options',
								default: 'DESC',
								options: [
											{
												name: 'ASC',
												value: 'ASC',
											},
											{
												name: 'DESC',
												value: 'DESC',
											},
								]
							},
							{
								displayName: 'Start Index',
								name: 'start_index',
								required:	true,
								type: 'number',
								default: 1,
								description: 'If return all is true then this field won\'t have any effect'
							},
					]
					}
				]
			},
			{
				displayName: "Page Context",
				name: "page_context_template",
				type: "fixedCollection",
				required: true,
				typeOptions: {
					maxValue: 1,
					minValue: 1,
					multipleValues: true
				},
				default: {
					values: [
						{
							row_count: 10,
							start_index: 1,
							sort_column: 'modified_time',
							sort_order: 'DESC',
							search_columns: {}
						}
					]
				},
				displayOptions: {
					show: {
						resource: [
							"template"
						],
						operation: [
							"getTemplatesList"
						]
					}
				},
				options: [
					{
						displayName: "Values",
						name: "values",
						values: [
							{
								displayName: 'Row Count',
								name: 'row_count',
								required:	true,
								type: 'number',
								default: 10,
								description: 'If return all is true then this field won\'t have any effect'
							},
							{
								displayName: 'Search Columns',
								name: 'search_columns',
								type: 'collection',
								default: {},
								options: [
									{
										displayName: 'Template Name',
										name: 'template_name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Owner Name',
										name: 'owner_name',
										type: 'string',
										default: '',
									},
								]
							},
							{
								displayName: 'Sort Column',
								name: 'sort_column',
								required:	true,
								type: 'options',
								default: 'template_name',
								options: [
											{
												name: 'Template Name',
												value: 'template_name',
											},
											{
												name: 'Owner Name',
												value: 'owner_name',
											},
											{
												name: 'Modified Time',
												value: 'modified_time',
											},
								]
							},
							{
								displayName: 'Sort Order',
								name: 'sort_order',
									required:	true,
								type: 'options',
								default: 'DESC',
								options: [
											{
												name: 'ASC',
												value: 'ASC',
											},
											{
												name: 'DESC',
												value: 'DESC',
											},
								]
							},
							{
								displayName: 'Start Index',
								name: 'start_index',
								required:	true,
								type: 'number',
								default: 1,
								description: 'If return all is true then this field won\'t have any effect'
							},
					]
					}
				]
			},
						{
				displayName: "Actions Mapping Mode",
				name: "actions_mapping",
				type: "options",
				default: "simple",
				options: [
					{
						name: "Simple",
						description: "Manually set/choose from limited set of options",
						value: "simple"
					},
					{
						name: "Complex",
						description: "Highly flexible, construct a JSON that will be sent as it is",
						value: "complex"
					}
				],
				displayOptions: {
					show: {
						resource: [
							"template",
							"document",
						],
						operation: [
							"submitTemplate",
							"updateDocument"
						]
					}
				}
			},
			{
				displayName: "Actions",
				name: "actions",
				required: true,
				placeholder: "Add Action",
				displayOptions: {
					show: {
						resource: [
							"document",
						],
						operation: [
							"updateDocument",
						],
						actions_mapping: ["simple"]
					}
				},
				type: "fixedCollection",
				typeOptions: {
					multipleValues: true,
				},
				default: {
					values: [
					]
				},
				options: [
					{
						displayName: 'Action Details',
						name: "values",
						values: [
							{
								displayName: 'Action Type',
								name: 'action_type',
								type: 'options',
								options: [
									{
										name: 'SIGN',
										value: 'SIGN',
										description: "This recipient will need to sign the document"
									},
									{
										name: 'VIEW',
										value: 'VIEW',
										description: "This recipient will recieve a copy"
									},
									{
										name: 'INPERSONSIGN',
										value: 'INPERSONSIGN',
									},
									{
										name: 'APPROVER',
										value: 'APPROVER',
									},
								],
								default: 'SIGN',
							},
							{
								displayName: 'In Person Email',
								name: 'in_person_email',
								default: '',
								type: 'string',
								description: "This needs to be provided if action type is INPERSONSIGN"
							},
							{
								displayName: 'In Person Name',
								name: 'in_person_name',
								default: '',
								description: "This needs to be provided if action type is INPERSONSIGN",
								type: 'string',
							},
							{
								displayName: 'Private Notes',
								name: 'private_notes',
								default: '',
								type: 'string',
							},
							{
								displayName: 'Recipient Email',
								name: 'recipient_email',
								required:	true,
								default: '',
								type: 'string',
							},
							{
								displayName: 'Recipient Name',
								name: 'recipient_name',
								required:	true,
								default: '',
								type: 'string',
							},
							{
								displayName: 'Verification Code',
								name: 'verification_code',
								default: '',
								type: 'string',
							},
							{
								displayName: 'Verification Type',
								name: 'verification_type',
								default: 'EMAIL',
								type: 'options',
								options: [
											{
												name: 'EMAIL',
												value: 'EMAIL',
											},
											{
												name: 'SMS',
												value: 'SMS',
											},
											{
												name: 'OFFLINE',
												value: 'OFFLINE',
											},
								]
							},
							{
								displayName: 'Verify Recipient',
								name: 'verify_recipient',
								default: false,
								type: 'boolean',
							},
						]
					}
				]
			},
			{
				displayName: "Notice: Use 'Complex' actions mapping mode if your signing action type for this template involves types other than 'Needs to Sign'.",
				name: "actions_template_simple_notice",
				type: "notice",
				default: "",
				displayOptions: {
					show: {
						resource: ["template"],
						operation: ["submitTemplate"],
						actions_mapping: ["simple"]
					}
				}
			},
			{
				displayName: "Actions",
				name: "actions_template",
				required: true,
				placeholder: "Add Action",
				displayOptions: {
					show: {
						resource: [
							"template",
						],
						operation: [
							"submitTemplate",
						],
						actions_mapping: ["simple"],
					}
				},
				type: "fixedCollection",
				typeOptions: {
					multipleValues: true,
				},
				default: {
					values: [
					]
				},
				options: [
					{
						displayName: 'Action Details',
						name: "values",
						values: [
							{
								displayName: 'Recipient Email',
								name: 'recipient_email',
								required:	true,
								default: '',
								type: 'string',
							},
							{
								displayName: 'Recipient Name',
								name: 'recipient_name',
								required:	true,
								default: '',
								type: 'string',
							},
						]
					}
				]
			},
			{
				displayName: "Actions JSON",
				name: "actions_json",
				required: true,
				displayOptions: {
					show: {
						resource: ["document", "template"],
						operation: ["updateDocument", "submitTemplate"],
						actions_mapping: ["complex"]
					},
				},
				type: "json",
				default: `
[
	// Use 'Get' and 'Format Actions' to get a structure for this input. 
]
`, 
			}
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0)
		const operation = this.getNodeParameter('operation', 0)

		const executionResults: INodeExecutionData[] = []

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
			
				let requestMethod: IHttpRequestMethods = "POST";
				const qs: IDataObject = {};

				switch (resource) {
					case 'document': {
						switch (operation) {

							// ====== 
							// GET
							// ======
							
							case 'getDocumentsList': {

								const returnAll = this.getNodeParameter("return_all", itemIndex) as boolean;
								const simplify = this.getNodeParameter("simplify_output", itemIndex) as boolean;
								
								requestMethod = "GET"
							
								const values = this.getNodeParameter("page_context", itemIndex) as {
									values: {
										row_count: number,
										start_index: number,
										sort_column: string,
										sort_order: string,
										search_columns: object
									}[]
								}

								if(values.values.length != 1) {
									throw new NodeOperationError(this.getNode(), "Page context must be provided with either 0 or 1 set of values")
								}

								if(returnAll) {
									values.values[0].row_count = 25;
									values.values[0].start_index = 1;
								}

								let hasMoreRows = false;

								do {
									qs.data = jsonStringify({
										page_context: {
											row_count: values.values[0].row_count,
											start_index: values.values[0].start_index,
											sort_column: values.values[0].sort_column,
											sort_order: values.values[0].sort_order,
											search_columns: values.values[0].search_columns
										}
									})

									const responseData = await apiRequest.call(
										this, requestMethod, "requests", {}, qs, undefined, undefined, true
									);
					
									for(const j of responseData.requests) {
										if(!simplify) {
											executionResults.push({
												json: j, pairedItem: {item: itemIndex}
											})
										} else {
											executionResults.push({
												json: {
													request_status: j.request_status,
													owner_id: j.owner_id,
													request_name: j.request_name,
													modified_time: j.modified_time,
													owner_email: j.owner_email,
													request_id: j.request_id,
													request_type_name: j.request_type_name,
												}, pairedItem: {item: itemIndex}
											})
										}
										
									}

									hasMoreRows = responseData.page_context.has_more_rows
									values.values[0].start_index += values.values[0].row_count

								} while(returnAll && hasMoreRows)

								break;
								
							}

							case "getDetailsParticularDocument": {

								const requestId = this.getNodeParameter(
									"request_id", itemIndex
								)
								const responseData = await apiRequest.call(
									this, "GET", `requests/${requestId}`, {}
								)

								const simplify = this.getNodeParameter("simplify_output", itemIndex) as boolean;
								const formatActions = this.getNodeParameter(
									"format_actions_document", itemIndex
								) as boolean;

								// just output actions with placeholder '<value>'
								if(formatActions) {
									executionResults.push(
										{json: {
											actions: responseData.requests.actions?.map((action: IDataObject) => {
												delete action["action_id"]
												delete action["action_status"]
												delete action["is_bulk"]

												action.recipient_email = "<value>"
												action.signing_order = "<value>"
												action.recipient_name = "<value>"
												
												if("in_person_name" in action) {
													action.in_person_name = "<value>"
													action.in_person_email = "<value>"
												}

												if("sub_actions" in action) {
													action.sub_actions = (action.sub_actions as IDataObject[]).map((subaction) => {
														delete subaction["signer_id"]
														delete subaction["action_status"]
														delete subaction["action_id"]
														delete subaction["is_bulk"]

														subaction.recipient_email = "<value>"
														subaction.recipient_name = "<value>"
														subaction.signing_order = "<value>"
														if("role" in subaction) {
															subaction.role = "<value>"
														}

														subaction = formatFields(subaction)

														return subaction
													})
												}
												
												action = formatFields(action)

												return action
											})
										}, pairedItem: {item: itemIndex}}
									)
									continue
								}

								if(!simplify) {
									executionResults.push(
										{json: responseData.requests, pairedItem: {item: itemIndex}}
									)
								} else {
									executionResults.push(
										{json: {
											request_status: responseData.requests.request_status,
											owner_id: responseData.requests.owner_id,
											request_name: responseData.requests.request_name,
											is_deleted: responseData.requests.is_deleted,
											modified_time: responseData.requests.modified_time,
											document_ids: responseData.requests.document_ids?.map((docId: IDataObject) => {
												return {
													document_name: docId.document_name,
													total_pages: docId.total_pages,
													document_id: docId.document_id,
												}
											}),
											request_id: responseData.requests.request_id,
											request_type_id: responseData.requests.request_type_id,
											actions: responseData.requests.actions?.map((action: IDataObject) => {
												return {
													action_id: action.action_id,
													recipient_email: action.recipient_email,
													recipient_name: action.recipient_name,
													action_type: action.action_type,
													delivery_mode: action.delivery_mode
												}
											})
										}, pairedItem: {item: itemIndex}}
									)
								}

								break;

							}

							case "getDocumentFormData": {

								const requestId = this.getNodeParameter(
									"request_id", itemIndex
								)

								const responseData = await apiRequest.call(
									this, "GET", `requests/${requestId}/fielddata`, {}
								)

								executionResults.push(
									{json: responseData.document_form_data, pairedItem: {item: itemIndex}}
								)

								break;

							}

							case "getFolderList": {

								const responseData = await apiRequest.call(
									this, "GET", `folders`, {}
								)

								for(const j of responseData.folders) {
									executionResults.push({
										json: j, pairedItem: {item: itemIndex}
									})
								}

								break;

							}

							case "retrieveFieldTypes": {

								const responseData = await apiRequest.call(
									this, "GET", 'fieldtypes', {}
								)

								for(const j of responseData.field_types) {
									executionResults.push({
										json: j, pairedItem: {item: itemIndex}
									})
								}

								break;

							}

							case "getDocumentTypes": {

								const responseData = await apiRequest.call(
									this, "GET", 'requesttypes', {}
								)

								for(const j of responseData.request_types) {
									executionResults.push({
										json: j, pairedItem: {item: itemIndex}
									})
								}

								break; 

							}

							case "downloadPDF": {

								const requestId = this.getNodeParameter(
									"request_id", itemIndex
								)

								const with_coc = this.getNodeParameter("with_coc", itemIndex)
								const merge = this.getNodeParameter("merge", itemIndex)
								const password = this.getNodeParameter("password", itemIndex)

								const domain = await getDomain.call(this)

								let mimeType = 'application/pdf';
								
								qs.with_coc = with_coc
								qs.merge = merge;
								if(password !== '') {
									qs.password = password
								}
					
								const responseData = await apiRequest.call(
									this, 
									"GET", 
									'', 
									{},
									qs,
									undefined,
									{
										url: `https://sign.${domain}/api/v1/requests/${requestId}/pdf`,										
										useStream: true,
										returnFullResponse: true,
										encoding: 'arraybuffer',
										json: false,
									}
								)	

								const headers = responseData.headers;
								mimeType =  (headers['content-type'] as string).split(";")[0]

								const data = await this.helpers.prepareBinaryData(
									responseData.body as Buffer,
									`${requestId}`,
									mimeType
								);

								executionResults.push({
									json: {},
									binary: { data },
									pairedItem: {item: itemIndex}
								});

								break;

							}

							case "downloadParticularPdfFile": {

								const requestId = this.getNodeParameter(
									"request_id", itemIndex
								)
								const documentId = this.getNodeParameter(
									"document_id", itemIndex
								)

								const domain = await getDomain.call(this)

								const mimeType = 'application/pdf';
					
								const responseData = await apiRequest.call(
									this, 
									"GET", 
									'', 
									{},
									qs,
									undefined,
									{
										url: `https://sign.${domain}/api/v1/requests/${requestId}/documents/${documentId}/pdf`,										
										useStream: true,
										returnFullResponse: true,
										encoding: 'arraybuffer',
										json: false,
									}
								)	

								const data = await this.helpers.prepareBinaryData(
									responseData.body as Buffer,
									`${documentId}`,
									mimeType
								);

								executionResults.push({
									json: {},
									binary: { data },
									pairedItem: {item: itemIndex}
								});

								break;

							}

							case "downloadCompletionCertificate": {

								const requestId = this.getNodeParameter(
									"request_id", itemIndex
								)

								const domain = await getDomain.call(this)

								const mimeType = 'application/pdf';

								const documentDetailsResponse = await apiRequest.call(
										this,
										"GET",
										`requests/${requestId}`,
										{},
									)

								const status = documentDetailsResponse.requests.request_status

								if(status !== 'completed') throw new NodeOperationError(this.getNode(), "Cannot download COC for a request that hasn't been signed yet")
					
								const responseData = await apiRequest.call(
									this, 
									"GET", 
									'', 
									{},
									qs,
									undefined,
									{
										url: `https://sign.${domain}/api/v1/requests/${requestId}/completioncertificate`,										
										useStream: true,
										returnFullResponse: true,
										encoding: 'arraybuffer',
										json: false,
									}
								)	

								const data = await this.helpers.prepareBinaryData(
									responseData.body as Buffer,
									`${requestId}_coc`,
									mimeType
								);

								executionResults.push({
									json: {},
									binary: { data },
									pairedItem: {item: itemIndex}
								});

								break;

							}

							// ====== 
							// POST
							// ======


							case "recallDocument": {

								const requestId = this.getNodeParameter(
									"request_id", itemIndex
								)

								const reason = this.getNodeParameter(
									"reason", itemIndex
								)

								const formData: FormData = new FormData()
								formData.append("reason", reason)

								const responseData = await apiRequest.call(
									this,
									"POST",
									`requests/${requestId}/recall`,
									formData,
									undefined,
									undefined,
									undefined,
									true
								)

								executionResults.push({
									json: { ...responseData },
									pairedItem: {item: itemIndex}
								});

								break;

							}

							case "remindRecipient": {

								const requestId = this.getNodeParameter(
									"request_id", itemIndex
								)

								const responseData = await apiRequest.call(
									this,
									"POST",
									`requests/${requestId}/remind`,
									{},
								)

								executionResults.push({
									json: { ...responseData },
									pairedItem: {item: itemIndex}
								});

								break;

							}

							case "createNewFolder": {
								
								const folderName = this.getNodeParameter(
									"folder_name", itemIndex
								) as string;

								const formData = new FormData()
								formData.append("data", jsonStringify({
									folders: {
										folder_name: folderName
									}
								}))

								const responseData = await apiRequest.call(
									this,
									"POST",
									`folders`,
									formData,
									undefined,
									undefined,
									undefined, 
									true
								)

								executionResults.push({
									json: { ...responseData },
									pairedItem: {item: itemIndex}
								});

								break;

							}

							case "createNewDocumentType": {

								const requestTypeName = this.getNodeParameter(
									"request_type_name", itemIndex
								) as string;
								const requestTypeDescription = this.getNodeParameter(
									"request_type_description", itemIndex
								)

								const formData = new FormData()
								formData.append("data", jsonStringify({
									request_types: {
										request_type_name: requestTypeName,
										request_type_description: requestTypeDescription
									}
								}))

								const responseData = await apiRequest.call(
									this,
									"POST",
									`requesttypes`,
									formData,
									undefined,
									undefined,
									undefined, 
									true
								)

								executionResults.push({
									json: { ...responseData },
									pairedItem: {item: itemIndex}
								});

								break;

							}

							case "correctDocument": {

								const requestId = this.getNodeParameter(
									"request_id", itemIndex
								)

								const responseData = await apiRequest.call(
									this,
									"POST",
									`requests/${requestId}/markforcorrection`,
									{},
									undefined,
									undefined,
									undefined, 
									true
								)

								executionResults.push({
									json: { ...responseData },
									pairedItem: {item: itemIndex}
								});

								break;

							}

							case "createDocument": {

								const foundBinaryFiles = await getAllBinaryDataPairedWithItem.call(this, items, itemIndex)

								if(foundBinaryFiles.length == 0) {
									throw new NodeOperationError(this.getNode(), "Atleast one binary file has to be paired with an input item to use this node");
								}

								const requestId = this.getNodeParameter(
									"create_document_request_id", itemIndex
								)
								const simplify = this.getNodeParameter(
									"simplify_output", itemIndex
								) as boolean;	
								
								let finalRequestId = (requestId !== "") ? requestId: undefined

								let responseData: {
										requests: IDataObject
									} = {requests: {}}

								for(let fileIndex = 0; fileIndex < foundBinaryFiles.length; fileIndex++) {
									const formData = new FormData();
									formData.append("file", new Blob([foundBinaryFiles[fileIndex].fileContent]), foundBinaryFiles[fileIndex].originalFileName)

									if(finalRequestId) {

										responseData = await apiRequest.call(
											this,
											'PUT',
											`requests/${finalRequestId}`,
											formData,
											undefined,
											undefined,
											undefined,
											true
										)

									} else {
										formData.append("data", jsonStringify({"requests":{"request_name": foundBinaryFiles[fileIndex].originalFileName || "","is_sequential":true}}));
										responseData = await apiRequest.call(
											this,
											'POST',
											'requests',
											formData,
											{},
											undefined,
											undefined,
											true
										);
										finalRequestId = responseData.requests.request_id
									}
								}

								if(!simplify) {
									executionResults.push({
										json: {...responseData.requests},
										pairedItem: {item: itemIndex}
									})
								} else {
									executionResults.push({
										json: {
											request_status: responseData.requests.request_status,
											request_name: responseData.requests.request_name,
											modified_time: responseData.requests.modified_time,
											owner_email: responseData.requests.owner_email,
											request_id: responseData.requests.request_id,
											request_type_id: responseData.requests.request_type_id,
											document_ids: (responseData.requests.document_ids as IDataObject[]).map((docId) => {
												return {
													document_name: docId.document_name,
													document_id: docId.document_id
												}
											}) 
										},
										pairedItem: {item: itemIndex}
									})
								}

								break;

							}

							case "submitDocument": {

								const requestId = this.getNodeParameter(
									"request_id", itemIndex
								)
								const responseData = await apiRequest.call(
									this,
									"POST",
									`requests/${requestId}/submit`,
									{},
									undefined,
									undefined,
									undefined,
									true
								)
								const simplify = this.getNodeParameter(
									"simplify_output", itemIndex
								) as boolean

								if(!simplify) {
									executionResults.push({
										json: { ...responseData },
										pairedItem: {item: itemIndex}
									})
								} else {
									executionResults.push({
										json: {
											requests: {
												request_name: responseData.requests.request_name,
												owner_email: responseData.requests.owner_email,
												request_id: responseData.requests.request_id,
												zsdocumentid: responseData.requests.zsdocumentid,
											},
											status: responseData.status,
											message: responseData.message
										},
										pairedItem: {item: itemIndex}
									})
								}			

								break;

							}

							// ====== 
							// PUT
							// ======

							case "deleteDocument": {

								const requestIdsString = this.getNodeParameter(
									"request_ids_list", itemIndex
								) as string;
								const recall_inprogress = this.getNodeParameter(
									"recall_inprogress", itemIndex
								);

								const requestIds: string[] = (jsonParse(requestIdsString) as {data: string[]}).data

								if(!requestIds || requestIds.length === 0) {
									throw new NodeOperationError(this.getNode(), `request ids must be of the json form: {"data":[]}`)
								}

								const formData = new FormData()
								formData.append("recall_inprogress", recall_inprogress)
								formData.append("delete_ids", jsonStringify(requestIds)) 

								if(recall_inprogress) {
									const reason = this.getNodeParameter(
										"deleted_reason", itemIndex
									);
									if(reason === "") {
										throw new NodeOperationError(this.getNode(), "Reason is mandatory for deletion of documents that have been submitted for signatures")
									}
									formData.append("reason", reason)	
								}

								const responseData = await apiRequest.call(
									this,
									"PUT",
									`requests/delete`,
									formData,
									undefined,
									undefined,
									undefined,
									true
								)

								executionResults.push({
									json: responseData,
									pairedItem: {item: itemIndex}
								})

								break;

							}

							case "extendDocument": {

								const requestId = this.getNodeParameter(
									"request_id", itemIndex
								)
								const expireBy = this.getNodeParameter(
									"expire_by", itemIndex
								) as string

								const date = new Date(expireBy).toLocaleDateString(
									'en-GB', {
										day: 'numeric',
										month: 'long', 
										year: 'numeric'
									}
								)

								const formData = new FormData()
								formData.append("expire_by", date)

								const responseData = await apiRequest.call(
									this,
									"PUT",
									`requests/${requestId}/extend`,
									formData,
									undefined,
									undefined,
									undefined,
									true
								)

								executionResults.push({
									json: responseData,
									pairedItem: {item: itemIndex}
								})

								break;

							}

							case "updateDocumentType": {

								const requestTypeId = this.getNodeParameter(
									"request_type_id", itemIndex, undefined, {
										extractValue: true
									}
								) as string;
								const requestTypeName = this.getNodeParameter(
									"request_type_name", itemIndex
								) as string;
								const requestTypeDescription = this.getNodeParameter(
									"request_type_description", itemIndex
								) as string;

								const formData = new FormData()
								
								const req: {
									request_types: {
										request_type_name: string,
										request_type_description?: string
									}
								} = {
									request_types: {
										request_type_name: requestTypeName,
									}
								}

								if(requestTypeDescription !== "") {
									req.request_types.request_type_description = requestTypeDescription
								}

								formData.append("data", jsonStringify(req))

								const responseData = await apiRequest.call(
									this,
									"PUT",
									`requesttypes/${requestTypeId}`,
									formData,
									undefined,
									undefined,
									undefined, 
									true
								)

								executionResults.push({
									json: { ...responseData },
									pairedItem: {item: itemIndex}
								});

								break;

							}

							case "updateDocument": {

								const requestId = this.getNodeParameter("request_id", itemIndex);
								const requestName = this.getNodeParameter("request_name", itemIndex);
								const requestTypeId = this.getNodeParameter('request_type_id', itemIndex, undefined, {extractValue: true}) as string;
								const notes = this.getNodeParameter("notes", itemIndex);
								const expirationDays = this.getNodeParameter("expiration_days", itemIndex);
								const isSequential = this.getNodeParameter('is_sequential', itemIndex);
								const emailReminders = this.getNodeParameter('email_reminders', itemIndex);
								const reminderPeriod = this.getNodeParameter("reminder_period", itemIndex);
								const folderId = this.getNodeParameter("folder_id", itemIndex);
								const actions_mapping = this.getNodeParameter("actions_mapping", itemIndex) as string;
								const simplify = this.getNodeParameter("simplify_output", itemIndex)

								const requests: IDataObject = {}
								if(requestName !== "") requests.request_name = requestName
								if(requestTypeId !== "") requests.request_type_id = requestTypeId
								if(notes !== "") requests.notes = notes
								if(expirationDays !== 0) requests.expiration_days = expirationDays
								requests.is_sequential = isSequential
								requests.email_reminders = emailReminders
								requests.reminder_period = reminderPeriod
								if(folderId !== "") requests.folder_id = folderId


								if(actions_mapping === "simple") {
									const actions = this.getNodeParameter("actions", itemIndex) as {
										values: IDataObject[]
									}
									let signing_order = 1
									requests.actions = actions.values?.map((action) => {
										action.signing_order = signing_order
										signing_order = signing_order + 1
										return action
									})
								} else if(actions_mapping === "complex") {
									try {
										
										const actions = this.getNodeParameter("actions_json", itemIndex) as string
										requests.actions = jsonParse(
											actions
										)

									} catch(error) {
										throw new NodeOperationError(this.getNode(), error)
									}
								} else {
									throw new NodeOperationError(this.getNode(), "actions mapping value is invalid")
								}

								const formData = new FormData()
								formData.append("data", jsonStringify({
									requests: requests
								}))

								const responseData = await apiRequest.call(
									this,
									"PUT",
									`requests/${requestId}`,
									formData,
									{},
									undefined,
									undefined,
									true
								)

								if(!simplify) {
									executionResults.push({
										json: {
											...responseData
										},
										pairedItem: {item: itemIndex}
									})
								} else {
									executionResults.push({
										json: {
											requests: {
												request_status: responseData.requests.request_status,
												request_name: responseData.requests.request_name,
												owner_email: responseData.requests.owner_email,
												request_type_name: responseData.requests.request_type_name,
												request_id: responseData.requests.request_id,
												request_type_id: responseData.requests.request_type_id,
												actions: responseData.requests?.actions?.map((action: IDataObject) => {
													return {
														action_type: action.action_type,
														recipient_email: action.recipient_email,
														action_id: action.action_id,
														recipient_name: action.recipient_name,
														delivery_mode: action.delivery_mode
													}
												})
											},
											message: responseData.message,
											status: responseData.status,
										},
										pairedItem: {item: itemIndex}
									})
								}

								break;
							}

						}
						break;
					}
					case 'template': {
						switch(operation) {

							// ============
							// GET
							// ============


							case 'getTemplatesList': {

								const returnAll = this.getNodeParameter("return_all", itemIndex) as boolean;
								
								requestMethod = "GET"
							
								const values = this.getNodeParameter("page_context_template", itemIndex) as {
									values: {
										row_count: number,
										start_index: number,
										sort_column: string,
										sort_order: string,
										search_columns: object
									}[]
								}

								const simplify = this.getNodeParameter("simplify_output", itemIndex) as boolean;

								if(values.values.length != 1) {
									throw new NodeOperationError(this.getNode(), "Page context must be provided with either 0 or 1 set of values")
								}

								if(returnAll) {
									values.values[0].row_count = 25;
									values.values[0].start_index = 1;
								}

								let hasMoreRows = false;

								do {
									qs.data = jsonStringify({
										page_context: {
											row_count: values.values[0].row_count,
											start_index: values.values[0].start_index,
											sort_column: values.values[0].sort_column,
											sort_order: values.values[0].sort_order,
											search_columns: values.values[0].search_columns
										}
									})

									const responseData = await apiRequest.call(
										this, requestMethod, "templates", {}, qs, undefined, undefined, true
									);
					
									for(const j of responseData.templates) {

										if(!simplify) {
											executionResults.push({
												json: j, pairedItem: {item: itemIndex}
											})
										} else {
											executionResults.push({
												json: {
													template_id: j.template_id,
													request_type_id: j.request_type_id,
													owner_email: j.owner_email,
													template_name: j.template_name,
													description: j.description,
													document_ids: j.document_ids?.map((doc: IDataObject) => {
														return {
															document_name: doc.document_name,
															document_id: doc.document_id
														}
													}),
													actions: j.actions?.map((action: IDataObject) => {
														return {
															action_id: action.action_id,
															role: action.role,
															action_type: action.action_type,
															delivery_mode: action.delivery_mode,
															recipient_email: action.recipient_email,
															recipient_name: action.recipient_name
														}
													})
												}, pairedItem: {item: itemIndex}
											})
										}
									
									}

									hasMoreRows = responseData.page_context.has_more_rows
									values.values[0].start_index += values.values[0].row_count

								} while(returnAll && hasMoreRows)

								break;

							}

							case "getTemplateDetails": {

								const templateId = this.getNodeParameter(
									"template_id", itemIndex
								)

								const responseData = await apiRequest.call(
									this,
									"GET",
									`templates/${templateId}`,
									{}
								)

								const simplify = this.getNodeParameter(
									"simplify_output", itemIndex
								)
								const formatActions = this.getNodeParameter(
									"format_actions_template", itemIndex
								) as boolean;

								if(formatActions) {

									executionResults.push({
										json: {
											prefill_fields: {
												field_data: {
													field_text_data: formatTemplatePrefillFieldsTextData(responseData.templates.document_fields),
													field_boolean_data: formatTemplatePrefillFieldsBooleanData(responseData.templates.document_fields),
													field_date_data: formatTemplatePrefillFieldsDateData(responseData.templates.document_fields),
													field_radio_data: formatTemplatePrefillFieldsRadioData(responseData.templates.document_fields),
													field_checkboxgroup_data: formatTemplatePrefillFieldsCheckboxGroupData(responseData.templates.document_fields)
												}
											},
											actions: formatTemplateActions(responseData.templates.actions)
										}, pairedItem: {item: itemIndex}
									})

									continue
								}

								if(!simplify) {
									executionResults.push({
										json: responseData.templates, pairedItem: {item: itemIndex}
									})
								} else {
									executionResults.push({
										json: {
											template_id: responseData.templates.template_id,
											request_type_id: responseData.templates.request_type_id,
											owner_email: responseData.templates.owner_email,
											template_name: responseData.templates.template_name,
											document_ids: responseData.templates.document_ids?.map((doc: IDataObject) => {
												return {
													document_name: doc.document_name,
													document_id: doc.document_id
												}
											}),
											actions: responseData.templates?.actions.map((action: IDataObject) => {
												return {
													action_id: action.action_id,
													signing_order: action.signing_order,
													recipient_email: action.recipient_email,
													recipient_name: action.recipient_name,
													action_type: action.action_type,
													delivery_mode: action.delivery_mode,
													role: action.role
												}
											})
										}, pairedItem: {item: itemIndex}
									})
								}

								break;

							}

							// ============
							// POST
							// ============

							case "createTemplate": {
								
								const foundBinaryFiles = await getAllBinaryDataPairedWithItem.call(this, items, itemIndex)

								if(foundBinaryFiles.length == 0) {
									throw new NodeOperationError(this.getNode(), "Atleast one binary file has to be paired with an input item to use this node");
								}
								
								const simplify = this.getNodeParameter("simplify_output", itemIndex) as boolean;
								const templateId = this.getNodeParameter(
									"template_id_create_template", itemIndex
								)

								let finalTemplateId = (templateId !== "") ? templateId: undefined;

								let responseData: {
									templates: IDataObject
								} = {templates: {}}

								for(let fileIndex = 0; fileIndex < foundBinaryFiles.length; fileIndex++) {
									const formData = new FormData();
									formData.append("file", new Blob([foundBinaryFiles[fileIndex].fileContent]), foundBinaryFiles[fileIndex].originalFileName)

									if(finalTemplateId) {

										responseData = await apiRequest.call(
											this,
											'PUT',
											`templates/${finalTemplateId}`,
											formData,
											undefined,
											undefined,
											undefined,
											true
										)

									} else {
										formData.append("data", jsonStringify({"templates":{"template_name": foundBinaryFiles[fileIndex].originalFileName || "","is_sequential":true}}));
										responseData = await apiRequest.call(
											this,
											'POST',
											'templates',
											formData,
											{},
											undefined,
											undefined,
											true
										);
										finalTemplateId = responseData.templates.template_id
									}
								}

								if(!simplify) {
									executionResults.push({
										json: { ...responseData.templates}, pairedItem: {item: itemIndex}
									})
								} else {
									executionResults.push({
										json: {
											template_id: responseData.templates.template_id,
											request_type_id: responseData.templates.request_type_id,
											owner_email: responseData.templates.owner_email,
											document_ids: (responseData.templates.document_ids as IDataObject[])?.map((doc: IDataObject) => {
												return {
													document_name: doc.document_name,
													document_id: doc.document_id
												}
											}),
											actions: (responseData.templates.actions as IDataObject[])?.map((action: IDataObject) => {
												return {
													action_id: action.action_id,
													recipient_name: action.recipient_name,
													recipient_email: action.recipient_email,
													action_type: action.action_type,
												}
											})
										}, pairedItem: {item: itemIndex}
									})
								}

								break;

							}

							case "submitTemplate": {

								const templateId = this.getNodeParameter(
									"template_submit", itemIndex, undefined, {
										extractValue: true
									}
								) as string;
								const notes = this.getNodeParameter(
									"notes", itemIndex
								) as string
								const isQuickSend = this.getNodeParameter(
									"is_quicksend", itemIndex
								)
								const requestName = this.getNodeParameter(
									"request_name_template", itemIndex
								) as string;
								const prefillFields = this.getNodeParameter(
									"prefill_fields", itemIndex
								)
								const action_mapping = this.getNodeParameter(
									"actions_mapping", itemIndex
								) as string;

								const simplify = this.getNodeParameter(
									"simplify_output", itemIndex
								) as boolean;

								const templateData = await apiRequest.call(
									this,
									"GET",
									`templates/${templateId}`,
									{}
								) as {
									templates: IDataObject
								}

								let presentActions = templateData.templates.actions as IDataObject[]

								if (action_mapping === "simple") {
									const actions = this.getNodeParameter(
										"actions_template", itemIndex
									) as {
										values: IDataObject[]
									}
	
									if(actions.values.length !== presentActions.length) {
										throw new NodeOperationError(
											this.getNode(), "Given template actions mismatch with n8n actions array"
										)
									}
	
									let index = 0;
									presentActions = presentActions.map((action) => {
										const n8nAction = actions.values[index]
										index = index + 1;
										action.recipient_email = n8nAction.recipient_email
										action.recipient_name = n8nAction.recipient_name
										delete action["fields"]
										return action
									})
								} else if(action_mapping === "complex") {
									presentActions = jsonParse(this.getNodeParameter("actions_json", itemIndex) as string)
								}

								const data: {
									templates: {
										request_name: string,
										notes: string,
										actions: IDataObject[]
										field_data?: object
									}
								} = { 
									templates: {
										request_name: requestName,
										notes: notes,
										actions: presentActions
									}
								}

								if(prefillFields && data.templates) {
									try {
										const prefillFieldsJson: {
											field_data: {
												field_text_data: object,
												field_boolean_data: object,
												field_date_data: object,
												field_radio_data: object,
												field_checkboxgroup_data: object
											}
										} = jsonParse(this.getNodeParameter(
											"prefill_fields_json", itemIndex
										) as string)

										data.templates.field_data = prefillFieldsJson.field_data as object
									} catch {
										throw new NodeOperationError(
											this.getNode(), "Invalid JSON for prefill fields"
										)
									}
								}

								const formData = new FormData()
								formData.append("is_quicksend", isQuickSend)
								formData.append("data", jsonStringify(data))

								const responseData = await apiRequest.call(
									this,
									"POST",
									`templates/${templateId}/createdocument`,
									formData,
									undefined,
									undefined,
									undefined,
									true
								)

								if(!simplify) {
									executionResults.push({
										json: responseData.requests, pairedItem: {item: itemIndex}
									})
								} else {
									executionResults.push({
										json: {
											request_status: responseData.requests.request_status,
											request_name: responseData.requests.request_name,
											owner_email: responseData.requests.owner_email,
											zsdocumentid: responseData.requests.zsdocumentid,
											request_type_id: responseData.requests.request_type_id,
											sign_id: responseData.requests.sign_id,
											request_id: responseData.requests.request_id,
											document_ids: responseData.requests.document_ids?.map((doc: IDataObject) => {
												return {
													document_name: doc.document_name,
													document_id: doc.document_id
												}
											}),
											actions: responseData.requests.actions?.map((action: IDataObject) => {
												return {
													action_id: action.action_id,
													recipient_name: action.recipient_name,
													recipient_email: action.recipient_email,
													action_type: action.action_type,
												}
											})
										}, pairedItem: {item: itemIndex}
									})
								}

								break;

							}

							// ============
							// PUT
							// ============

							case "deleteTemplate": {

								const templateId = this.getNodeParameter(
									"template_id", itemIndex
								)

								const responseData = await apiRequest.call(
									this,
									"PUT",
									`templates/${templateId}/delete`,
									{}
								)

								executionResults.push({
									json: {...responseData}, pairedItem: {item: itemIndex}
								})

								break;

							}

						}
						break;
					}
				}

			} catch (error) {
				if (this.continueOnFail()) {
					executionResults.push({
						json: {"error": error.message},
						pairedItem: {item: itemIndex}
					})
				} else {
					if (error.context) {
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [executionResults];
	}
}