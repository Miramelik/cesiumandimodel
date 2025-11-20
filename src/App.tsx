/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import "./App.scss";
import {
  useAccessToken,
} from "@itwin/web-viewer-react";
import React, { useCallback, useEffect, useState } from "react";

import { Auth } from "./Auth";
import { history } from "./history";

import { ItwinViewer} from "./components/itwin/ITwinViewer";
import { CesiumViewer } from "./components/cesium/CesuimViewer";
import { ScenarioToolbar } from "./scenarios/ScenarioToolbar";

  /** ------------------------------------------------------
   * 1. iTwin View IDs from ENV or URL
   * ------------------------------------------------------*/

const App: React.FC = () => {
  const [iModelId, setIModelId] = useState(process.env.IMJS_IMODEL_ID);
  const [iTwinId, setITwinId] = useState(process.env.IMJS_ITWIN_ID);
  const [changesetId, setChangesetId] = useState(
    process.env.IMJS_AUTH_CLIENT_CHANGESET_ID
  );
  const [currentScenario, setCurrentScenario] = useState<string>("bus");


    /** ------------------------------------------------------
   * 2. Authentication Setup
   * ------------------------------------------------------*/

  const accessToken = useAccessToken();

  const authClient = Auth.getClient();

  const login = useCallback(async () => {
    try {
      await authClient.signInSilent();
    } catch {
      await authClient.signIn();
    }
  }, [authClient]);

  useEffect(() => {
    void login();
  }, [login]);

  /** ------------------------------------------------------
   * 3. Parse incoming URL parameters
   * ------------------------------------------------------*/
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("iTwinId")) {
      setITwinId(urlParams.get("iTwinId") as string);
    }
    if (urlParams.has("iModelId")) {
      setIModelId(urlParams.get("iModelId") as string);
    }
    if (urlParams.has("changesetId")) {
      setChangesetId(urlParams.get("changesetId") as string);
    }
  }, []);

    /** ------------------------------------------------------
   * 4. Update browser URL when ids change
   * ------------------------------------------------------*/

  useEffect(() => {
    let url = `viewer?iTwinId=${iTwinId}`;

    if (iModelId) {
      url = `${url}&iModelId=${iModelId}`;
    }

    if (changesetId) {
      url = `${url}&changesetId=${changesetId}`;
    }
    history.push(url);
  }, [iTwinId, iModelId, changesetId]);



  return (
    <div className="app-root" style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* FLOATING SCENARIO BUTTONS */}
       <ScenarioToolbar
      currentScenario={currentScenario}
      onScenarioChange= {setCurrentScenario}
      />

      {/*  CESIUM VIEWER — ALWAYS VISIBLE, FULL SCREEN */}
           <div id= "cesiumContainer"
           style={{ width: "100%", height: "100vh" , overflow: "hidden"            
           }}
           >
              <CesiumViewer currentScenario={currentScenario} />
          </div>

      {/*  ITWIN VIEWER — ONLY VISIBLE FOR IFC SCENARIO */}
    {currentScenario === "ifc" && ( 
      <div 
        id = "iModelViewer"
        style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "50%",
            height: "100vh",
            background: "white",
            borderRight: "3px solid #ccc",
            zIndex: 5000,
          }}
        >
    
      <ItwinViewer
        iTwinId={iTwinId ?? ""}
        iModelId={iModelId ?? ""}
        changesetId={changesetId}
        authClient={authClient}
        
      />
    </div>  
    )}

            {/* CESIUM POPUP (moved out here so it floats above everything) */}
          <div 
          id="infoPopup" 
          style = {{
            position: "absolute",
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "6px",
            display: "none",
            pointerEvents: "none",
            zIndex: 1000,
          }}
          ></div>
    </div>
  );
};

export default App;
