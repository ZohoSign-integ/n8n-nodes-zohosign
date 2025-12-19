
interface notificationsData {
    performed_by_email: string,
    performed_at: string,
    reason: string,
    activity: string,
    operation_type: string,
    action_id: string,
    performed_by_name: string,
    ip_address: string
}

interface requestsData {
    request_status: string,
    owner_email: string,
    document_ids: {
        document_name: string,
        document_size: number,
        document_order: number,
        total_pages: number,
        document_id: string
    }[],
    self_sign: boolean,
    owner_id: string,
    request_name: string,
    modified_time: string,
    action_time: string,
    is_sequential: boolean,
    owner_first_name: string,
    request_type_name: string,
    request_id: string,
    owner_last_name: string,
    request_type_id: string,
    zsdocumentid: string,
    actions: {
        verify_recipient: boolean,
        action_type: string,
        action_id: string,
        recipient_email: string,
        is_embedded: boolean,
        signing_order: number,
        recipient_name: string,
        action_status: string
    }[]
}

export interface ISignBody {
    requests: requestsData,
    notifications: notificationsData,
}

export interface ISignHeader {
    "x-zs-webhook-signature": string
}
