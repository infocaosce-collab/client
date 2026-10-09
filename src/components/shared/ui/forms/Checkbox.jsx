import { forwardRef } from 'react';
import styles from './Checkbox.module.css';
import { Check } from 'lucide-react';
export const Checkbox = forwardRef(({ className, ...props }, ref) => {
    return (<div className={styles.checkboxWrapper}>
        <input {...props} type="checkbox" ref={ref} className={`${styles.checkbox} ${className || ''}`}/>
        <Check className={styles.checkmark} aria-hidden="true"/>
      </div>);
});
Checkbox.displayName = 'Checkbox';
