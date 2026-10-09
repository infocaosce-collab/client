"use client";
import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { Dialog, DialogContent } from "../overlays/Dialog";
import styles from "./Command.module.css";
const Command = React.forwardRef(({ className, ...props }, ref) => (<CommandPrimitive ref={ref} className={`${styles.command} ${className ?? ""}`} {...props}/>));
Command.displayName = CommandPrimitive.displayName;
const CommandDialog = ({ children, ...props }) => {
    return (<Dialog {...props}>
      <DialogContent className={styles.CommandDialogContent}>
        <Command className={styles.commandInDialog}>
          {children}
        </Command>
      </DialogContent>
    </Dialog>);
};
const CommandInput = React.forwardRef(({ className, ...props }, ref) => (<div className={styles.cmdkInputWrapper}>
    <Search className={styles.cmdkInputWrapperSearchIcon}/>
    <CommandPrimitive.Input ref={ref} className={`${styles.cmdkInput} ${className ?? ""}`} {...props}/>
  </div>));
CommandInput.displayName = CommandPrimitive.Input.displayName;
const CommandList = React.forwardRef(({ className, ...props }, ref) => (<CommandPrimitive.List ref={ref} className={`${styles.commandList} ${className ?? ""}`} {...props}/>));
CommandList.displayName = CommandPrimitive.List.displayName;
const CommandEmpty = React.forwardRef((props, ref) => (<CommandPrimitive.Empty ref={ref} className={styles.commandEmpty} {...props}/>));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;
const CommandGroup = React.forwardRef(({ className, ...props }, ref) => (<CommandPrimitive.Group ref={ref} className={`${styles.commandGroup} ${className ?? ""}`} {...props}/>));
CommandGroup.displayName = CommandPrimitive.Group.displayName;
const CommandSeparator = React.forwardRef(({ className, ...props }, ref) => (<CommandPrimitive.Separator ref={ref} className={`${styles.commandSeparator} ${className ?? ""}`} {...props}/>));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;
const CommandItem = React.forwardRef(({ className, ...props }, ref) => (<CommandPrimitive.Item ref={ref} className={`${styles.commandItem} ${className ?? ""}`} {...props}/>));
CommandItem.displayName = CommandPrimitive.Item.displayName;
const CommandShortcut = ({ className, ...props }) => {
    return (<span className={`${styles.commandShortcut} ${className ?? ""}`} {...props}/>);
};
CommandShortcut.displayName = "CommandShortcut";
export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator, };
