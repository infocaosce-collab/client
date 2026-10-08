import styles from "./Skeleton.module.css";
function Skeleton({ className, ...props }) {
    return (<div className={`${styles.skeleton} ${className ?? ""}`} {...props}/>);
}
export { Skeleton };
