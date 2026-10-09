"use client";
import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import styles from "./Accordion.module.css";
const Accordion = AccordionPrimitive.Root;
const AccordionItem = React.forwardRef(({ className, ...props }, ref) => (<AccordionPrimitive.Item ref={ref} className={`${styles.item} ${className || ""}`} {...props}/>));
AccordionItem.displayName = "AccordionItem";
const AccordionTrigger = React.forwardRef(({ className, children, ...props }, ref) => (<AccordionPrimitive.Header className={styles.header}>
    <AccordionPrimitive.Trigger ref={ref} className={`${styles.trigger} ${className || ""}`} {...props}>
      {children}
      <ChevronDown className={styles.icon}/>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;
const AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => (<AccordionPrimitive.Content ref={ref} className={`${styles.content} ${className || ""}`} {...props}>
    <div className={styles.contentInner}>{children}</div>
  </AccordionPrimitive.Content>));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
