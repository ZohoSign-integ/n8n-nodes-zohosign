import { IDataObject } from "n8n-workflow";


export function formatFields(action: IDataObject): IDataObject {
    
    if(!("fields" in action)) {
        return action
    }

    action.fields = (action.fields as IDataObject[])?.map((field: IDataObject) => {
        delete field["field_id"]
        delete field["action_id"]
        delete field["is_disabled"]
        delete field["is_hidden"]
        delete field["time_zone_offset"]
        delete field["field_values"]
        delete field["field_type_id"]
        
        if(field["sub_fields"] !== undefined && field["sub_fields"] !== null) {
            field.sub_fields = (field["sub_fields"] as IDataObject[]).map((subField) => {
                delete subField["sub_field_id"]
                return subField
            })
        }
        if(field["dropdown_values"] !== undefined && field["dropdown_values"] !== null) {
            field.dropdown_values = (field["dropdown_values"] as IDataObject[])?.map((dropdown) => {
                delete dropdown["dropdown_value_id"]
                return dropdown
            })
        }

        field.document_id = "<value>"
        if("page_no" in field) {
            field.page_no = "<value>"
        }
        
        return field
    })
    
    return action
} 

function formatTemplatePrefillFields(documentFields: IDataObject[], toMatch: string[]): IDataObject {
    const responseObj: IDataObject = {}
    
    documentFields.forEach((documentField) => {
        (documentField.fields as IDataObject[]).forEach((field: IDataObject) => {
            if(toMatch.find((val) => val === field.field_category)) {
                const label: string = field.field_label as string
                responseObj[label] = "<value>"
            }
        })
    })

    return responseObj
}

export function formatTemplatePrefillFieldsTextData(documentFields: IDataObject[]): IDataObject {
    const toMatch = [
        "textfield",
        "dropdown",
    ]
    const responseObj = formatTemplatePrefillFields(documentFields, toMatch)

    const fieldsToRemove = [
        "Full name",
        "Email",
        "Company",
        "Job title"
    ]

    for(let i = 0; i < fieldsToRemove.length; i++) {
        delete responseObj[fieldsToRemove[i]]
    }

    return responseObj
}

export function formatTemplatePrefillFieldsBooleanData(documentFields: IDataObject[]) {
    const toMatch = [
        "checkbox",
    ]
    
    const responseObj = formatTemplatePrefillFields(documentFields, toMatch) 

    for(const [k,] of Object.entries(responseObj)) {
        responseObj[k] = true
    }

    return responseObj
}

export function formatTemplatePrefillFieldsDateData(documentFields: IDataObject[]) {
    const toMatch = [
        "datefield",
    ]
    const responseObj = formatTemplatePrefillFields(documentFields, toMatch) 
    
    delete responseObj["Sign date"]

    for(const [k,] of Object.entries(responseObj)) {
        responseObj[k] = "20 January 1970"
    }
    
    return responseObj
}

export function formatTemplatePrefillFieldsRadioData(documentFields: IDataObject[]) {
    const toMatch = [
        "radiogroup",
    ]
    return formatTemplatePrefillFields(documentFields, toMatch)
}

export function formatTemplatePrefillFieldsCheckboxGroupData(documentFields: IDataObject[]) {
    const toMatch = [
        "checkboxgroup",
    ]
    
    const responseObj = formatTemplatePrefillFields(documentFields, toMatch)

    for(const [k,] of Object.entries(responseObj)) {
        responseObj[k] = []
    }

    return responseObj
}

// this isn't as verbose as 'update' document redacting & formatting that we do. 
export function formatTemplateActions(actions: IDataObject[]): IDataObject[] {
    const fieldsToInclude = [
        "action_id",
        "action_type",
        "role",
        "is_signing_group",
        "recipient_name",
        "recipient_email",
        "delivery_mode",
        "private_notes",
        "verify_recipient",
        "language",
        "in_person_name",
        "in_person_email",
        "signing_order",
        "recipient_specified",
        "is_subaction",
        "sub_actions"
    ]
    return actions.map((action) => {
        if("sub_actions" in action) {
            action.sub_actions = formatTemplateActions(action.sub_actions as IDataObject[])
        }
        for(const [k,] of Object.entries(action)) {
            // if the field is not in the fields to include, nuke it
            if(!fieldsToInclude.find((field) => field === k)) {
                delete action[k]
            }
        }
        return action
    })
}