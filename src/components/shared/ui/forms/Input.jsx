import React, { forwardRef } from "react";
import styles from "./Input.module.css";
export const Input = forwardRef(({ className, ...props }, ref) => {
    return (<input ref={ref} className={`${styles.input} ${className || ""}`} {...props}/>);
});
Input.displayName = "Input";
