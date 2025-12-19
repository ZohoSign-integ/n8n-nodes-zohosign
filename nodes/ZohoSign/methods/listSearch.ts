import { IDataObject, ILoadOptionsFunctions, INodeListSearchResult, jsonStringify } from "n8n-workflow";
import { apiRequest } from "../transport";

type TemplateResult = {
    template_name: string,
    template_id: string
}

type RequestTypeResult = {
    request_type_name: string,
    request_type_id: string
}

async function getAllTemplates(this: ILoadOptionsFunctions): Promise<TemplateResult[]> {
    const pageContext = {
        row_count: 10,
        start_index: 1,
        sort_column: "",
        sort_order: "",
        search_columns: {},
    } as {
        row_count: number,
        start_index: number,
        sort_column: string,
        sort_order: string,
        search_columns: object
    }

    const qs: IDataObject = {};

    pageContext.row_count = 25;
    pageContext.start_index = 1;

    let hasMoreRows = false;

    const executionResults: TemplateResult[] = []

    do {
        qs.data = jsonStringify({
            page_context: {
                row_count: pageContext.row_count,
                start_index: pageContext.start_index,
                sort_column: pageContext.sort_column,
                sort_order: pageContext.sort_order,
                search_columns: pageContext.search_columns
            }
        })

        const responseData = await apiRequest.call(
            this, "GET", "templates", {}, qs, undefined, undefined, true
        );

        for(const j of responseData.templates) {
            executionResults.push({
                template_id: j.template_id,
                template_name: j.template_name
            })
        }

        hasMoreRows = responseData.page_context.has_more_rows
        pageContext.start_index += pageContext.row_count

    } while(hasMoreRows)

    return executionResults;
} 

async function getAllRequestTypes(this: ILoadOptionsFunctions): Promise<RequestTypeResult[]> {
    
    const results: RequestTypeResult[] = []
    
    const responseData = await apiRequest.call(
        this, "GET", 'requesttypes', {}
    )

    for(const j of responseData.request_types) {
        results.push({
           request_type_id: j.request_type_id,
           request_type_name: j.request_type_name
        });
    }

    return results;
}

export async function templateSearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {

    const results = await getAllTemplates.call(this);

    return {
        results: results.map((template: TemplateResult) => ({
            name: template.template_name,
            value: template.template_id
        }))
    }

}


export async function requestTypeSearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {

    const results = await getAllRequestTypes.call(this);

    return {
        results: results.map((template: RequestTypeResult) => ({
            name: template.request_type_name,
            value: template.request_type_id
        }))
    }

}