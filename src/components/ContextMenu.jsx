"use client";
import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Check, ChevronRight } from "lucide-react";
import styles from "./ContextMenu.module.css";
const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuGroup = ContextMenuPrimitive.Group;
const ContextMenuPortal = ContextMenuPrimitive.Portal;
const ContextMenuSub = ContextMenuPrimitive.Sub;
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;
const ContextMenuSubTrigger = React.forwardRef(({ className, inset, children, ...props }, ref) => (<ContextMenuPrimitive.SubTrigger ref={ref} className={`${styles.subTrigger} ${className ?? ""} ${inset ? styles.inset : ""}`} {...props}>
    {children}
    <ChevronRight className={styles.chevronRightIcon}/>
  </ContextMenuPrimitive.SubTrigger>));
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;
const ContextMenuSubContent = React.forwardRef(({ className, ...props }, ref) => (<ContextMenuPrimitive.SubContent ref={ref} className={`${styles.subContent} ${className ?? ""}`} {...props}/>));
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;
const ContextMenuContent = React.forwardRef(({ className, ...props }, ref) => (<ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content ref={ref} className={`${styles.content} ${className ?? ""}`} {...props}/>
  </ContextMenuPrimitive.Portal>));
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;
const ContextMenuItem = React.forwardRef(({ className, inset, ...props }, ref) => (<ContextMenuPrimitive.Item ref={ref} className={`${styles.item} ${className ?? ""} ${inset ? styles.inset : ""}`} {...props}/>));
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;
const ContextMenuCheckboxItem = React.forwardRef(({ className, children, checked, ...props }, ref) => (<ContextMenuPrimitive.CheckboxItem ref={ref} className={`${styles.checkboxItem} ${className ?? ""}`} checked={checked} {...props}>
    <span className={styles.checkboxItemIndicator}>
      <ContextMenuPrimitive.ItemIndicator>
        <Check className={`${styles.checkIcon}`}/>
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>));
ContextMenuCheckboxItem.displayName =
    ContextMenuPrimitive.CheckboxItem.displayName;
const ContextMenuRadioItem = React.forwardRef(({ className, children, ...props }, ref) => (<ContextMenuPrimitive.RadioItem ref={ref} className={`${styles.radioItem} ${className ?? ""}`} {...props}>
    <span className={styles.radioItemIndicator}>
      <ContextMenuPrimitive.ItemIndicator>
        <div className={styles.radioIndicatorCircle}/>
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>));
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;
const ContextMenuLabel = React.forwardRef(({ className, inset, ...props }, ref) => (<ContextMenuPrimitive.Label ref={ref} className={`${styles.label} ${className ?? ""} ${inset ? styles.inset : ""}`} {...props}/>));
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;
const ContextMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (<ContextMenuPrimitive.Separator ref={ref} className={`${styles.separator} ${className ?? ""}`} {...props}/>));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;
const ContextMenuShortcut = ({ className, ...props }) => {
    return (<span className={`${styles.shortcut} ${className ?? ""}`} {...props}/>);
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";
export { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuGroup, ContextMenuPortal, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuRadioGroup, };
