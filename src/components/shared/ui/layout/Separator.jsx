import React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import styles from "./Separator.module.css";
export const Separator = ({ orientation = "horizontal", className = "", decorative = true, }) => {
    return (<SeparatorPrimitive.Root className={`${styles.separator} ${styles[orientation]} ${className ?? ""}`} orientation={orientation} decorative={decorative}/>);
};
