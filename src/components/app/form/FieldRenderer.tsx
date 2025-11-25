import React from "react";
// IconButton peut ne pas être présent selon la version du design system.
// S'il est disponible, on l'utilise pour l'action d'édition; sinon on garde un <button> simple.
// @ts-ignore
import {Button, Card, classnames, Divider, IconButton, Tab, Tabs, TextField} from "@udixio/ui-react";

type FieldRendererProps = {
    meta: any;
    formik: any;
    defs: Record<string, any> | undefined;
    disabledFields?: string[];
};

export function FieldRenderer({meta, formik, defs, disabledFields}: FieldRendererProps) {
    const f = meta;
    const name = f.name as string;
    const type = String(f.type);
    const disabled = !!disabledFields?.includes(name);
    const label = (f.ui?.label || f.documentation || f.name) + (f.isRequired ? '*' : '');
    const common = {
        name,
        disabled,
        className: "",
        value: (type === 'Boolean') ? undefined : (formik.values as any)[name] ?? '',
        onChange: formik.handleChange,
        onBlur: formik.handleBlur,
    } as any;
    const placeholder = f.ui?.placeholder || name;
    const isNumber = type === 'Int' || type === 'BigInt' || type === 'Float' || type === 'Decimal';
    const isEnum = (defs as any)?.[type]?.['isEnum'];

    if (type === 'String' || isNumber) {
        return <TextField  {...common} onChange={(e) =>
            formik.setFieldValue(name, e)
        } variant="outlined" label={label}
                           errorText={formik.errors}
                           placeholder={placeholder} {...(isNumber ? {type: 'number'} : {})}/>;
    }
    if (isEnum || type === 'Boolean' || type === 'DateTime' || type === 'Json') {
        (common as any).className += "border border-outline px-2 py-1 w-full";
        return <>
            <label className="block text-sm mb-1">
                {f.ui?.label || f.documentation || f.name}
                {f.isRequired && <span className="text-red-500"> *</span>}
            </label>
            {isEnum && (() => {
                const enumDef = (defs as any)?.[type];
                const values = Array.isArray(enumDef?.values) ? enumDef?.values : Object.values(enumDef?.values || {}).map((v: any) => v.name);
                return <select {...common} name={name} disabled={disabled}>
                    <option value="">Sélectionner...</option>
                    {values.map((val: any) => (
                        <option key={String(val)} value={String(val)}>{String(val)}</option>
                    ))}
                </select>
            })()}
            {type === 'Boolean' && (
                <div className="flex items-center gap-2">
                    <input type="checkbox" name={name} checked={!!(formik.values as any)[name]}
                           onChange={(e) => formik.setFieldValue(name, e.target.checked)} disabled={disabled}/>
                    <span className="text-sm">{f.ui?.label || name}</span>
                </div>
            )}
            {type === 'DateTime' && <input {...common} type="datetime-local"/>}
            {type === 'Json' && (
                <textarea className="border w-full px-2 py-1 h-20" name={name}
                          value={(formik.values as any)[name] ?? ''}
                          onChange={(e) => formik.setFieldValue(name, e.target.value)}/>
            )}
            {formik.touched[f.name] && (formik.errors as any)[f.name] && (
                <div className="text-xs text-red-600 mt-1">{String((formik.errors as any)[f.name])}</div>
            )}
        </>;
    }
    console.error(`Unknown field type: ${type}`);
    return null;
}