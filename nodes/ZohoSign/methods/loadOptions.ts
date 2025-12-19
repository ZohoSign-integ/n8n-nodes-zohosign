import { IDataObject, ILoadOptionsFunctions} from "n8n-workflow";
import { apiRequest } from "../transport";



export async function getTemplateRecipients(this: ILoadOptionsFunctions): Promise<{values: IDataObject[]}> {
    const templateId = this.getNodeParameter('template_submit', 0, {
        extractValue: true
    }) as string;

    const templateData = await apiRequest.call(
                        this,
                        "GET",
                        `templates/${templateId}`,
                        {}
                    ) as {
                        templates: IDataObject
                    }

    const presentActions = templateData.templates.actions as IDataObject[]

    return {
        values: presentActions.map(() => {return {}})
    };
}
