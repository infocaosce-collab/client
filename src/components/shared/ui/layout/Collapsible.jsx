"use client";
import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import styles from "./Collapsible.module.css";
const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = React.forwardRef(({ className, children, ...props }, ref) => (<CollapsiblePrimitive.Trigger ref={ref} className={`${styles.trigger} ${className || ""}`} {...props}>
    {children}
  </CollapsiblePrimitive.Trigger>));
CollapsibleTrigger.displayName = CollapsiblePrimitive.Trigger.displayName;
const CollapsibleContent = React.forwardRef(({ className, children, ...props }, ref) => (<CollapsiblePrimitive.Content ref={ref} className={`${styles.content} ${className || ""}`} {...props}>
    {children}
  </CollapsiblePrimitive.Content>));
CollapsibleContent.displayName = CollapsiblePrimitive.Content.displayName;
export { Collapsible, CollapsibleTrigger, CollapsibleContent };
