import React from "react";
import { SCENARIOS } from "./SCENARIOS";

interface Props {
  currentScenario: string;
  onScenarioChange: (id: string) => void;
}

export const ScenarioToolbar: React.FC<Props> = ({
  currentScenario,
  onScenarioChange,
}) => {
  return (
    <div
      style={{
        background: "white",
        padding: "10px",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        width: "240px",
      }}
    >
      <h4 style={{ marginTop: 0, marginBottom: "10px" }}>Scenarios</h4>

       {Object.values(SCENARIOS).map((scenario) => (
        <button
          key={scenario.id}
          onClick={() => onScenarioChange(scenario.id)}
          style={{
            width: "100%",
            //marginRight: "auto",
            marginBottom: "6px",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            background:
              currentScenario === scenario.id ? "#0078ff" : "#f5f5f5",
            color:
              currentScenario === scenario.id ? "white" : "black",
            cursor: "pointer",
          }}
        >
          {scenario.title}
        </button>
      ))}
    </div>
  );
};
