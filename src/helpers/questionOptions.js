export const optionKey = index => {
  let n = index + 1, output = "";
  while (n) { n -= 1; output = String.fromCharCode(65 + n % 26) + output; n = Math.floor(n / 26); }
  return output;
};
export const editableOptions = q => {
  if (Array.isArray(q?.options)) return q.options.map((o,i) => ({
    letter: o.letter || o.id || optionKey(i),
    label: o.label === undefined ? (o.letter || o.id || optionKey(i)) : o.label,
    text: o.text || "",
  }));
  return ["A","B","C","D","E"].filter(letter => !!q?.[`option${letter}`]).map(letter => ({
    letter, label: letter, text: q[`option${letter}`],
  }));
};
export const newOptions = () => [{letter:"A",label:"A",text:""},{letter:"B",label:"B",text:""}];
export const csvQuestionOptions = row => {
  const field = row.options_json || row.optionsjson;
  if (field) {
    const parsed = JSON.parse(field);
    if (!Array.isArray(parsed) || parsed.length < 2) throw Error("options_json must be an array with at least two options");
    return parsed.map((o,i) => typeof o === "string"
      ? {letter:optionKey(i),label:optionKey(i),text:o}
      : {letter:o.letter||o.id||optionKey(i),label:o.label === undefined ? optionKey(i) : o.label,text:o.text});
  }
  const opts = Object.keys(row).map(key => {
    const match = /^option_?([a-z]{1,3})$/i.exec(key);
    return match && row[key] ? {letter:match[1].toUpperCase(),label:match[1].toUpperCase(),text:row[key]} : null;
  }).filter(Boolean);
  return opts.sort((a,b)=>a.letter.length-b.letter.length || a.letter.localeCompare(b.letter));
};
