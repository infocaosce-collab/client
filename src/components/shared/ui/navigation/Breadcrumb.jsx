import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import styles from "./Breadcrumb.module.css";
const Breadcrumb = React.forwardRef(({ className, ...props }, ref) => (<nav ref={ref} aria-label="breadcrumb" className={`${styles.nav} ${className || ""}`} {...props}/>));
Breadcrumb.displayName = "Breadcrumb";
const BreadcrumbList = React.forwardRef(({ className, ...props }, ref) => (<ol ref={ref} className={`${styles.list} ${className || ""}`} {...props}/>));
BreadcrumbList.displayName = "BreadcrumbList";
const BreadcrumbItem = React.forwardRef(({ className, ...props }, ref) => (<li ref={ref} className={`${styles.item} ${className || ""}`} {...props}/>));
BreadcrumbItem.displayName = "BreadcrumbItem";
const BreadcrumbLink = React.forwardRef(({ asChild, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "a";
    return (<Comp ref={ref} className={`${styles.link} ${className || ""}`} {...props}/>);
});
BreadcrumbLink.displayName = "BreadcrumbLink";
const BreadcrumbPage = React.forwardRef(({ className, ...props }, ref) => (<span ref={ref} role="link" aria-disabled="true" aria-current="page" className={`${styles.page} ${className || ""}`} {...props}/>));
BreadcrumbPage.displayName = "BreadcrumbPage";
const BreadcrumbSeparator = ({ className, ...props }) => (<li role="presentation" aria-hidden="true" className={`${styles.separator} ${className || ""}`} {...props}>
    <ChevronRight size={14}/>
  </li>);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";
const BreadcrumbEllipsis = ({ className, ...props }) => (<span role="presentation" aria-hidden="true" className={`${styles.ellipsis} ${className || ""}`} {...props}>
    <MoreHorizontal size={14}/>
  </span>);
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";
export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis, };
