"use client";
import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import toggleStyles from "./Toggle.module.css";
import styles from "./ToggleGroup.module.css";
const ToggleGroupContext = React.createContext({
    size: "md",
    variant: "default",
});
const ToggleGroup = React.forwardRef(({ className, variant = "default", size = "md", children, ...props }, ref) => (<ToggleGroupPrimitive.Root ref={ref} className={`${styles.toggleGroup} ${className ?? ""}`} {...props}>
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>));
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;
const ToggleGroupItem = React.forwardRef(({ className, children, variant, size, ...props }, ref) => {
    const { variant: groupVariant, size: groupSize } = React.useContext(ToggleGroupContext);
    return (<ToggleGroupPrimitive.Item ref={ref} className={`${toggleStyles.toggle} ${toggleStyles["toggle-variant-" + (variant ?? groupVariant)]} ${toggleStyles["toggle-size-" + (size ?? groupSize)]} ${className ?? ""}`} {...props}>
      {children}
    </ToggleGroupPrimitive.Item>);
});
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;
export { ToggleGroup, ToggleGroupItem };
