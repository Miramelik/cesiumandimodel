/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

//import ResizableSplitter from "./components/ResizableSplitter";
import type { IModelConnection, ScreenViewport } from "@itwin/core-frontend";
import { 
    FitViewTool,
    IModelApp,
    StandardViewId
 } from "@itwin/core-frontend";
import { FillCentered } from "@itwin/core-react";
import { ECSchemaRpcInterface } from "@itwin/ecschema-rpcinterface-common";
import { ProgressLinear } from "@itwin/itwinui-react";
//import { CesiumViewer } from "./components/cesium/CesuimViewer";

import {
  MeasurementActionToolbar,
  MeasureTools,
  MeasureToolsUiItemsProvider,
} from "@itwin/measure-tools-react";
import {
  AncestorsNavigationControls,
  CopyPropertyTextContextMenuItem,
  PropertyGridManager,
  PropertyGridUiItemsProvider,
  ShowHideNullValuesSettingsMenuItem,
} from "@itwin/property-grid-react";
import {
  CategoriesTreeComponent,
  createTreeWidget,
  ModelsTreeComponent,
  TreeWidget,
} from "@itwin/tree-widget-react";
import {
  useAccessToken,
  Viewer,
  ViewerContentToolsProvider,
  ViewerNavigationToolsProvider,
  ViewerPerformance,
  ViewerStatusbarItemsProvider,
} from "@itwin/web-viewer-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Auth } from "../../Auth";
//import { history } from "./history";
import { unifiedSelectionStorage } from "../../selectionStorage"
import { log } from "console";
import {Visualization} from "./utils/Visualization"
import { IFCElementQuery, IFCElementStats } from "../../scenarios/ifc/IFCElementQuery";


interface ItwinViewerProps {
    iTwinId: string;
    iModelId: string;
    changesetId?: string;
    authClient: any;
    onStatsUpdate?: (stats:IFCElementStats | null)=> void;
}
export const ItwinViewer: React.FC<ItwinViewerProps> =({
    iTwinId,
    iModelId,
    changesetId,
    authClient,
    onStatsUpdate,
})=>{

  const [iModelConnection, setIModelConnection] = useState <IModelConnection | null> (null); 
      /** ---------------------------
   * VIEWPORT CONFIGURATION
   * --------------------------- */

  const viewConfiguration = useCallback((viewPort: ScreenViewport) => {
    // default execute the fitview tool and use the iso standard view after tile trees are loaded
    const tileTreesLoaded = () => {
       return new Promise((resolve, reject) => {
        const start = new Date();
        const intvl = setInterval(() => {
          if (viewPort.areAllTileTreesLoaded) {
            ViewerPerformance.addMark("TilesLoaded");
            ViewerPerformance.addMeasure(
              "TileTreesLoaded",
              "ViewerStarting",
              "TilesLoaded"
            );
            clearInterval(intvl);
            resolve(true);
          }
          const now = new Date();
          // after 20 seconds, stop waiting and fit the view
          if (now.getTime() - start.getTime() > 20000) {
            reject();
          }
        }, 100);
      });
    };

    tileTreesLoaded().finally(() => {
      void IModelApp.tools.run(FitViewTool.toolId, viewPort, true, false);
      viewPort.view.setStandardRotation(StandardViewId.Iso);
    });
  }, []);

  const viewCreatorOptions = useMemo(
    () => ({ viewportConfigurer: viewConfiguration }),
    [viewConfiguration]
  );

  // iModel now initialized
    const onIModelAppInit = useCallback(async () => {
    await TreeWidget.initialize();
    await PropertyGridManager.initialize();
    await MeasureTools.startup();
    MeasurementActionToolbar.setDefaultActionProvider();
    console.log("iModelApp initialized");
    
    
    IModelApp.viewManager.onViewOpen.addOnce((vp: ScreenViewport) => {
      console.log(`View opened: ${vp.iModel.name}`);
      Visualization.toggleHouseExterior(vp, false);
      Visualization.changeBackground(vp, "lightblue");
  });
  }, []);

     /** ---------------------------
    * ON IMODEL CONNECTED
    * --------------------------- */
    const onIModelConnected = useCallback(async (iModel: IModelConnection) => {
    console.log(`Connected to iModel: ${iModel.name}`);
    setIModelConnection(iModel);

    //Query IFC element statistics
    try {
      console.log ("Querying IFC element statistics...");
      const stats = await IFCElementQuery.getElementStats (iModel);

      //Send stats to parent component (App.tsx)

      if (onStatsUpdate) {
        onStatsUpdate (stats);
      }

      //log available IFC classes
      const classes = await IFCElementQuery.getAvailableIFCClasses (iModel);
      console.log ("Available IFC classes: ", classes);
    } catch (error) {
      console.error ("Error queryinng IFC Statitistics: ", error); 
      if (onStatsUpdate) {
        onStatsUpdate (null);
      }
    }
  }, [onStatsUpdate]);

  const accessToken=useAccessToken();


 return (
    <div style={{ width: "100%", height: "100%" }}>

      {!accessToken && (
        <FillCentered>
          <div className="signin-content">
            <ProgressLinear indeterminate={true} labels={["Signing in..."]} />
          </div>
        </FillCentered>
      )}

      <Viewer
        iTwinId={iTwinId}
        iModelId={iModelId}
        changeSetId={changesetId}
        authClient={authClient}
        enablePerformanceMonitors={true}
        viewCreatorOptions={viewCreatorOptions}
        onIModelAppInit={onIModelAppInit}
        onIModelConnected={onIModelConnected}
        backendConfiguration={{
          defaultBackend: {
            rpcInterfaces: [ECSchemaRpcInterface],
          },
        }}
        uiProviders={[
          new ViewerNavigationToolsProvider(),
          new ViewerContentToolsProvider({ vertical: { measureGroup: false } }),
          new ViewerStatusbarItemsProvider(),
          {
            id: "TreeWidgetUIProvider",
            getWidgets: () => [
              createTreeWidget({
                trees: [
                  {
                    id: ModelsTreeComponent.id,
                    getLabel: () => ModelsTreeComponent.getLabel(),
                    render: (props) => (
                      <ModelsTreeComponent
                        getSchemaContext={(iModel) => iModel.schemaContext}
                        density={props.density}
                        selectionStorage={unifiedSelectionStorage}
                        selectionMode={"extended"}
                        onPerformanceMeasured={props.onPerformanceMeasured}
                        onFeatureUsed={props.onFeatureUsed}
                      />
                    ),
                  },
                ],
              }),
            ],
          },
          new PropertyGridUiItemsProvider({
            propertyGridProps: {
              autoExpandChildCategories: true,
              ancestorsNavigationControls: (props) => (
                <AncestorsNavigationControls {...props} />
              ),
              contextMenuItems: [
                (props) => <CopyPropertyTextContextMenuItem {...props} />,
              ],
              settingsMenuItems: [
                (props) => (
                  <ShowHideNullValuesSettingsMenuItem {...props} persist={true} />
                ),
              ],
            },
          }),
          new MeasureToolsUiItemsProvider(),
        ]}
        selectionStorage={unifiedSelectionStorage}
      />
    </div>
  );
};

