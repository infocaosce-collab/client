import React from "react";
import { Slot } from "@radix-ui/react-slot";
import styles from "./Button.module.css";
export const Button = React.forwardRef(({ children, variant = "primary", size = "md", asChild = false, className, disabled, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (<Comp ref={ref} type={type} className={`
        ${styles.button} 
        ${styles[variant]} 
        ${styles[size]} 
        ${disabled ? styles.disabled : ""} 
        ${className || ""}
      `} disabled={disabled} {...props}>
        {children}
      </Comp>);
});
Button.displayName = "Button";
