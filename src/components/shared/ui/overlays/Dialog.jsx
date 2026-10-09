"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import styles from "./Dialog.module.css";
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (<DialogPrimitive.Overlay ref={ref} className={`${styles.overlay} ${className || ''}`} {...props}/>));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef(({ className, children, container, ...props }, ref) => (<DialogPortal container={container}>
    <DialogOverlay />
    <DialogPrimitive.Content ref={ref} className={`${styles.content} ${className || ''}`} {...props}>
      {children}
      <DialogPrimitive.Close className={styles.close}>
        <X className={styles.closeIcon}/>
        <span className={styles.screenReaderText}>Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>));
DialogContent.displayName = DialogPrimitive.Content.displayName;
const DialogHeader = ({ className, ...props }) => (<div className={`${styles.header} ${className || ''}`} {...props}/>);
DialogHeader.displayName = "DialogHeader";
const DialogFooter = ({ className, ...props }) => (<div className={`${styles.footer} ${className || ''}`} {...props}/>);
DialogFooter.displayName = "DialogFooter";
const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (<DialogPrimitive.Title ref={ref} className={`${styles.title} ${className || ''}`} {...props}/>));
DialogTitle.displayName = DialogPrimitive.Title.displayName;
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (<DialogPrimitive.Description ref={ref} className={`${styles.description} ${className || ''}`} {...props}/>));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, };
