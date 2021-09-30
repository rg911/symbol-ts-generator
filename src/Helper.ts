import { BuildInType, DispositionType } from './Enums';
import { Layout } from './interface/layout';

export class Helper {
    /**
     * Convert string name from snake_case, kebab-case, PascalCase to camel case.
     *
     * @param value - Input string
     * @returns camel case string
     */
    public static toCamel(value: string): string {
        return value
            .replace(/\s(.)/g, function ($1) {
                return $1.toUpperCase();
            })
            .replace(/\s/g, '')
            .replace(/^(.)/, function ($1) {
                return $1.toLowerCase();
            })
            .replace(/([-_][a-z])/gi, ($1) => {
                return $1.toUpperCase().replace('-', '').replace('_', '');
            });
    }

    /**
     * Check if schema type is struct
     * @param type - schema type
     * @returns true if schema type is struct
     */
    public static isStruct(type: string): boolean {
        return type === BuildInType.Struct.valueOf();
    }

    /**
     * Check if schema type is enum
     * @param type - schema type
     * @returns true if schema type is enum
     */
    public static isEnum(type: string): boolean {
        return type === BuildInType.Enum.valueOf();
    }

    /**
     * Check if schema type is byte
     * @param type - schema type
     * @returns true if schema type is byte
     */
    public static isByte(type: string): boolean {
        return type === BuildInType.Byte.valueOf();
    }

    /**
     * Check if layout attribute is inline
     * @param type - layout attribute
     * @returns true if layout attribute is inline
     */
    public static isInline(layout: Layout): boolean {
        return layout.disposition !== undefined && layout.disposition === DispositionType.Inline.valueOf();
    }

    /**
     * Check if layout attribute is const
     * @param type - layout attribute
     * @returns true if layout attribute is const
     */
    public static isConst(layout: Layout): boolean {
        return layout.disposition !== undefined && layout.disposition === DispositionType.Const.valueOf();
    }

    /**
     * Check if layout attribute is array
     * @param type - layout attribute
     * @returns true if layout attribute is array
     */
    public static isArray(layout: Layout): boolean {
        return layout.disposition !== undefined && layout.disposition === DispositionType.Array.valueOf();
    }

    /**
     * Check if layout attribute is reserved
     * @param type - layout attribute
     * @returns true if layout attribute is reserved
     */
    public static isReserved(layout: Layout): boolean {
        return layout.disposition !== undefined && layout.disposition === DispositionType.Reserved.valueOf();
    }

    /**
     * Check if layout attribute is fill array
     * @param type - layout attribute
     * @returns true if layout attribute is fill array
     */
    public static isFillArray(layout: Layout): boolean {
        return layout.disposition !== undefined && layout.disposition === DispositionType.ArrayFill.valueOf();
    }

    /**
     * Check if layout attribute is element array
     * @param type - layout attribute
     * @returns true if layout attribute is element array
     */
    public static isElementArray(layout: Layout): boolean {
        return (
            layout.disposition !== undefined &&
            layout.disposition === DispositionType.Array.valueOf() &&
            layout.element_disposition !== undefined
        );
    }

    /**
     * Check if layout attribute is sorted array
     * @param type - layout attribute
     * @returns true if layout attribute is sorted array
     */
    public static isSortArray(layout: Layout): boolean {
        return layout.disposition !== undefined && layout.disposition === DispositionType.Array.valueOf() && layout.sort_key !== undefined;
    }

    /**
     * Check if layout attribute is conditional
     * @param type - layout attribute
     * @returns true if layout attribute is conditional
     */
    public static isConditional(layout: Layout): boolean {
        return layout.disposition !== undefined && layout.disposition === DispositionType.Array.valueOf() && layout.condition !== undefined;
    }

    /**
     * Apply indentation of an input text line
     * @param instruction - input text line
     * @param indentCount - indentation count
     * @returns indented line
     */
    public static indent(instruction: string, indentCount: number): string {
        return ' '.repeat(indentCount * 4) + instruction;
    }

    /**
     * Insert a line / lines to and string array
     * @param instructions - instruction line or lines
     * @param lines - lines to be injected into
     * @param newLineAfter - insert an empty line or not
     * @returns inserted lines
     */
    public static writeLines(instructions: string | string[], lines: string[], newLineAfter = false): void {
        instructions = typeof instructions === 'string' ? [instructions] : instructions;
        lines.push(...instructions);
        if (newLineAfter) {
            lines.push('');
        }
    }

    /**
     * Convert byte type to typescript type
     * @param size - byte size
     * @returns typescript type
     */
    public static convertByteType(size?: number): string {
        if (size === undefined) {
            return 'Uint8Array';
        } else if (size < 8) {
            return 'number';
        } else if (size === 8) {
            return 'bigint';
        } else {
            return 'Uint8Array';
        }
    }

    public static getDeserializeUtilMethodByType(type: string, argName: string, size?: number): string {
        switch (type) {
            case 'Uint8Array':
                return `Utils.getBytes(Uint8Array.from(${argName}), ${size});`;
            case 'number':
                if (size === 1) {
                    return `Utils.bufferToUint8(Uint8Array.from(${argName}));`;
                } else if (size === 2) {
                    return `Utils.bufferToUint16(Uint8Array.from(${argName}));`;
                } else {
                    return `Utils.bufferToUint32(Uint8Array.from(${argName}));`;
                }
            case 'bigint':
                return `Utils.bufferToBigInt(Uint8Array.from(${argName}));`;
            default:
                return `${type}.deserialize(Uint8Array.from(${argName}));`;
        }
    }

    public static getSerializeUtilMethodByType(type: string, name: string, size?: number): string {
        switch (type) {
            case 'Uint8Array':
                return `this.${name};`;
            case 'number':
                if (size === 1) {
                    return `Utils.uint8ToBuffer(this.${name});`;
                } else if (size === 2) {
                    return `Utils.uint16ToBuffer(this.${name});`;
                } else {
                    return `Utils.uint32ToBuffer(this.${name});`;
                }
            case 'bigint':
                return `Utils.bigIntToBuffer(this.${name});`;
            default:
                return `${type}.deserialize(this.${name});`;
        }
    }

    /**
     * Detect and add import names to a list
     * @param importList - existing import list
     * @param type - type
     * @param name - name
     */
    public static addRequiredImport(importList: string[], type: string, name: string): void {
        if (type !== name && !Helper.isByte(type) && !['Uint8Array', 'number'].includes(type)) {
            importList.push(type);
        }
    }

    /**
     * Should generate class or not
     * @param name - class name
     * @returns should generate class or not
     */
    public static shouldGenerateClass(name: string): boolean {
        return !['SizePrefixedEntity', 'VerifiableEntity'].includes(name);
    }

    /**
     * Should declare variable or not
     * @param name - variable name
     * @returns should declare variable or not
     */
    public static shouldDeclareVariable(name: string): boolean {
        return name !== 'size' && name.lastIndexOf('_reserved') < 0;
    }
}
