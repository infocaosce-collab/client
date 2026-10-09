"use client";
import React from "react";
import { GripVertical } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";
import styles from "./Resizable.module.css";
export const ResizablePanelGroup = ({ className, ...props }) => (<ResizablePrimitive.PanelGroup className={`${styles.panelGroup} ${className || ""}`} {...props}/>);
export const ResizablePanel = ({ className, ...props }) => (<ResizablePrimitive.Panel className={`${styles.panel} ${className || ""}`} {...props}/>);
export const ResizableHandle = ({ withHandle = true, className, ...props }) => (<ResizablePrimitive.PanelResizeHandle className={`${styles.resizeHandle} ${className || ""}`} {...props}>
    {withHandle && (<div className={styles.resizeHandleGrip}>
        <GripVertical size={12} strokeWidth={1.5} className={styles.gripIcon}/>
      </div>)}
  </ResizablePrimitive.PanelResizeHandle>);
