import React, { useRef } from "react";
import "./ResizableSplitter.css";
import { useContainerWidth } from "@itwin/itwinui-react/cjs/utils";

const ResizableSplitter: React.FC<{
  leftId: string;
  rightId: string;
}> = ({ leftId, rightId }) => {
  const isResizing = useRef(false);

  const onMouseDown = () => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
  };

  const onMouseUp = () => {
    isResizing.current = false;
    document.body.style.cursor = "default";
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;

    const containerWidth = window.innerWidth;
    const x = e.clientX;

    const left = document.getElementById(leftId);
    const right = document.getElementById(rightId);

    if (left && right) {
      left.style.height = `${x}px`;
      right.style.height = `${containerWidth - x}px`;
    }
  };

  React.useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div className="splitter" onMouseDown={onMouseDown}></div>
  );
};

export default ResizableSplitter;
