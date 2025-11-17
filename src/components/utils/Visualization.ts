import { ColorDef, DisplayStyleSettingsProps, QueryRowFormat } from "@itwin/core-common";
import { IModelConnection, ScreenViewport, Viewport } from "@itwin/core-frontend";

export class Visualization {

    // Method for changing view baxkground color
    public static changeBackground = (Viewport:ScreenViewport, bgColor:string) => {
        const displayStyleProps: DisplayStyleSettingsProps = {
            backgroundColor:ColorDef.fromString (bgColor).tbgr
        }
        Viewport.overrideDisplayStyle (displayStyleProps);
    }

    //Method to toggle the visibility of the house exterior categories.  
    public static toggleHouseExterior = async (
    viewport: ScreenViewport,
    show: boolean
  ) => {
    const categoryIds = await Visualization.getCategoryIds(viewport.iModel);
    viewport.changeCategoryDisplay(categoryIds, show);
  };

  public static getCategoryIds = async (
    iModel: IModelConnection
  ): Promise<string[]> => {
    //List of categories for the house exterior.

    const categoriesToHide =[
        "'IFCClass_Default'",
        "'IFCClass_IFC_Footprints'",
        "'IFCClass_A__x002D__GENM__x002D________x002D__OTLN'", 
        "'IFCClass_Q__x002D__SPCQ__x002D________x002D__OTLN'"
    ]


    const query = `SELECT ECInstanceId FROM Bis.SpatialCategory WHERE CodeValue IN (${categoriesToHide.toString()})`;
    //const query = `SELECT ECInstanceId FROM IFCDynamic.ifcgrid `;

     const results = iModel.createQueryReader(query, undefined, {
      rowFormat: QueryRowFormat.UseJsPropertyNames,
    });

    const categoryIds = await results.toArray();

    return categoryIds.map((element) => element.id);
  };
}
