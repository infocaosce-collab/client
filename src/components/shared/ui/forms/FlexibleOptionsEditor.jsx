import { Button } from "../actions/Button";
import { Input } from "./Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";
import { optionKey } from "../../../../helpers/questionOptions";
import styles from "../../../osce/control-room/AdminContentPanel.module.css";

export function FlexibleOptionsEditor({ options, onChange, correctOption, onCorrectChange }) {
  const update = (index, key, value) => onChange(options.map((row,i) => i === index ? { ...row, [key]: value } : row));
  const add = () => {
    const used = new Set(options.map(o=>o.letter));
    let next = 0;
    while (used.has(optionKey(next))) next++;
    const letter = optionKey(next);
    onChange([...options, { letter, label: letter, text: "" }]);
  };
  const remove = letter => {
    const updated = options.filter(o => o.letter !== letter);
    onChange(updated);
    if (correctOption === letter) onCorrectChange(updated[0]?.letter || "");
  };
  return <div className={styles.flexOptions}>
    <strong>Answer options ({options.length})</strong>
    <p className={styles.minutesHint}>Labels are editable and may be blank. Use a blank label with True/False answer text if needed.</p>
    {options.map((o,i) => <div key={o.letter} className={styles.flexOptionRow}>
      <label className={styles.flexLabel}>Label
        <Input value={o.label} placeholder="Optional" aria-label={`Option ${i+1} label`} onChange={e=>update(i,"label",e.target.value)}/>
      </label>
      <label className={styles.flexAnswer}>Answer text
        <Input required value={o.text} aria-label={`Option ${i+1} answer text`} onChange={e=>update(i,"text",e.target.value)}/>
      </label>
      <Button type="button" variant="outline" size="sm" disabled={options.length <= 2} onClick={()=>remove(o.letter)} aria-label={`Remove option ${i+1}`}>Remove</Button>
    </div>)}
    <Button type="button" size="sm" variant="outline" disabled={options.length >= 100} onClick={add}>+ Add option</Button>
    <label className={styles.field}>Correct answer
      <Select value={correctOption} onValueChange={onCorrectChange}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent>{options.map((o,i)=><SelectItem key={o.letter} value={o.letter}>
          {o.label || `Option ${i+1}`} — {o.text || "(empty)"}
        </SelectItem>)}</SelectContent>
      </Select>
    </label>
  </div>;
}
