import React, { forwardRef } from "react";
import inputStyles from "./Input.module.css";
import styles from "./Textarea.module.css";
export const Textarea = forwardRef(({ className, disableResize = false, variant = "default", ...props }, ref) => {
    const resizeClass = disableResize ? styles.noResize : "";
    return (<textarea ref={ref} className={`${inputStyles.input} ${styles.textarea} ${resizeClass} ${styles[variant]} ${className || ""}`} {...props}/>);
});
Textarea.displayName = "Textarea";
