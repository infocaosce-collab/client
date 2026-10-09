import React from "react";
import styles from "./Spinner.module.css";
export const Spinner = ({ size = "md", className, ...props }) => {
    return (<div className={`${styles.spinner} ${styles[size]} ${className || ""}`} {...props} role="status">
      <div className={styles.spinnerInner}></div>
    </div>);
};
