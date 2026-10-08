import styles from "./Badge.module.css";
export const Badge = ({ variant = "primary", className, children, ...props }) => {
    return (<div className={`${styles.badge} ${styles[variant]} ${className || ""}`} {...props}>
      {children}
    </div>);
};
