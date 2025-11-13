import React, { useRef } from "react";
import "./ResizableSplitter.css";

const ResizableSplitter: React.FC<{
  topId: string;
  bottomId: string;
}> = ({ topId, bottomId }) => {
  const isResizing = useRef(false);

  const onMouseDown = () => {
    isResizing.current = true;
    document.body.style.cursor = "row-resize";
  };

  const onMouseUp = () => {
    isResizing.current = false;
    document.body.style.cursor = "default";
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;

    const containerHeight = window.innerHeight;
    const y = e.clientY;

    const top = document.getElementById(topId);
    const bottom = document.getElementById(bottomId);

    if (top && bottom) {
      top.style.height = `${y}px`;
      bottom.style.height = `${containerHeight - y}px`;
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
