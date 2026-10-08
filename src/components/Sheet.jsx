"use client";
import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import styles from "./Sheet.module.css";
const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;
const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => (<SheetPrimitive.Overlay className={`${styles.overlay} ${className ?? ""}`} {...props} ref={ref}/>));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;
const SheetContent = React.forwardRef(({ side = "right", className, children, container, ...props }, ref) => (<SheetPortal container={container}>
    <SheetOverlay />
    <SheetPrimitive.Content ref={ref} className={`${styles.content} ${styles[side]} ${className ?? ""}`} {...props}>
      {children}
      <SheetPrimitive.Close className={styles.close}>
        <X className={styles.closeIcon}/>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>));
SheetContent.displayName = SheetPrimitive.Content.displayName;
const SheetHeader = ({ className, ...props }) => (<div className={`${styles.header} ${className ?? ""}`} {...props}/>);
SheetHeader.displayName = "SheetHeader";
const SheetFooter = ({ className, ...props }) => (<div className={`${styles.footer} ${className ?? ""}`} {...props}/>);
SheetFooter.displayName = "SheetFooter";
const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (<SheetPrimitive.Title ref={ref} className={`${styles.title} ${className ?? ""}`} {...props}/>));
SheetTitle.displayName = SheetPrimitive.Title.displayName;
const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (<SheetPrimitive.Description ref={ref} className={`${styles.description} ${className ?? ""}`} {...props}/>));
SheetDescription.displayName = SheetPrimitive.Description.displayName;
export { Sheet, SheetPortal, SheetOverlay, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, };
