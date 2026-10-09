import { CommandGroup, CommandItem, CommandList } from "../navigation/Command";
import { Command as CommandPrimitive } from "cmdk";
import { useState, useRef, useCallback, } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../overlays/Popover";
import { Skeleton } from "../feedback/Skeleton";
import styles from "./AutoComplete.module.css";
const getDisplayText = (option) => {
    if (option.displayText) {
        return option.displayText;
    }
    if (typeof option.label === "string") {
        return option.label;
    }
    return option.value;
};
export const AutoComplete = ({ options, placeholder, emptyMessage, value, onValueChange, inputValue, onInputValueChange, disabled, isLoading = false, allowFreeForm = false, }) => {
    const inputRef = useRef(null);
    const [isOpen, setOpen] = useState(false);
    const [selected, setSelected] = useState(value);
    const handleKeyDown = useCallback((event) => {
        const input = inputRef.current;
        if (!input) {
            return;
        }
        // This is not a default behaviour of the <input /> field
        if (event.key === "Enter" && input.value !== "") {
            const optionToSelect = options.find((option) => getDisplayText(option) === input.value);
            if (optionToSelect) {
                setSelected(optionToSelect);
                onValueChange?.(optionToSelect);
            }
        }
        if (event.key === "Escape") {
            input.blur();
            setOpen(false);
        }
    }, [options, onValueChange]);
    const handleBlur = useCallback(() => {
        // Only reset the input value if the popover is closed and not in free-form mode
        // This prevents interference with the selection process
        if (!isOpen && !allowFreeForm) {
            onInputValueChange(selected ? getDisplayText(selected) : "");
        }
    }, [selected, isOpen, onInputValueChange, allowFreeForm]);
    const handleSelectOption = useCallback((selectedOption) => {
        onInputValueChange(getDisplayText(selectedOption));
        setSelected(selectedOption);
        onValueChange?.(selectedOption);
        // Close the popover after selection
        setOpen(false);
        // This is a hack to prevent the input from being focused after the user selects an option
        // We can call this hack: "The next tick"
        setTimeout(() => {
            inputRef?.current?.blur();
        }, 0);
    }, [onValueChange, onInputValueChange]);
    return (<Popover open={isOpen} onOpenChange={setOpen}>
      <CommandPrimitive onKeyDown={handleKeyDown} className={styles.autoComplete}>
        <div className={styles.inputWrapper}>
          <PopoverTrigger asChild>
            <CommandPrimitive.Input ref={inputRef} value={inputValue} onValueChange={isLoading ? undefined : onInputValueChange} onBlur={handleBlur} placeholder={placeholder} disabled={disabled} className={styles.customInput}/>
          </PopoverTrigger>
        </div>
        {!!options.length && (<PopoverContent removeBackgroundAndPadding className={styles.popoverContent} align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
            <CommandList className={styles.commandList}>
              {options.length > 0 && (<CommandGroup>
                  {options.map((option) => {
                    return (<CommandItem key={option.value} value={getDisplayText(option)} onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }} onSelect={() => handleSelectOption(option)}>
                        {option.label}
                      </CommandItem>);
                    {
                        isLoading ? (<CommandPrimitive.Loading>
                          <div className={styles.loadingContainer}>
                            <Skeleton style={{ height: "2rem" }}/>
                          </div>
                        </CommandPrimitive.Loading>) : null;
                    }
                })}
                </CommandGroup>)}
            </CommandList>
          </PopoverContent>)}
      </CommandPrimitive>
    </Popover>);
};
