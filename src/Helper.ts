import * as fs from 'fs-extra';
import { BuildInType, DispositionType } from './Enums';
import { Layout } from './interface/layout';
import LineByLine = require('n-readlines');
import path = require('path');
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
     * Return true is disposition is an array type
     * @param disposition -  disposition
     * @returns disposition is an array
     */
    public static isArrayDisposition(disposition?: string): boolean {
        if (disposition && ['array', 'array fill', 'array sized'].includes(disposition)) {
            return true;
        }
        return false;
    }

    /**
     * Return base type of an array
     * @param arrayType - param array type
     */
    public static getArrayKind(arrayType: string): string {
        return arrayType.replace('[', '').replace(']', '');
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
     * @param type - schema type
     * @param size - schema size
     * @returns typescript type
     */
    public static getGeneratedType(type: string, size?: number, disposition?: string): string {
        if (Helper.isByte(type)) {
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
        const arrayType = ['array', 'array fill', 'array sized'];
        if (arrayType.includes(type) || type.endsWith('Flags')) {
            return `${type}[]`;
        }
        if (disposition && (arrayType.includes(disposition) || disposition.endsWith('Flags'))) {
            return `${type}[]`;
        }
        return type;
    }

    /**
     * Get deserializer method name by type
     * @param type - parameter type
     * @param argName - argument name
     * @param size - parameter size
     * @returns deserializer method name
     */
    public static getDeserializeUtilMethodByType(type: string, argName: string, size?: number): string {
        type = Helper.getArrayKind(type);
        switch (type) {
            case 'Uint8Array':
                return `Utils.getBytes(${argName}, ${size});`;
            case 'number':
            case 'enum':
                if (size === 1) {
                    return `Utils.bufferToUint8(${argName});`;
                } else if (size === 2) {
                    return `Utils.bufferToUint16(${argName});`;
                } else {
                    return `Utils.bufferToUint32(${argName});`;
                }
            case 'bigint':
                return `Utils.bufferToBigInt(${argName});`;
            default:
                if (type.endsWith('Flags')) {
                    return `Utils.toFlags(${type}, Utils.bufferToUint8(${argName}));`;
                }
                return `${type}.deserialize(${argName});`;
        }
    }

    /**
     * Get serializer method by type
     * @param type - param type
     * @param name - param name
     * @param size - param name
     * @param disposition - param disposition
     * @returns serializer method text
     */
    public static getSerializeUtilMethodByType(type: string, name: string, size?: number, disposition?: string): string {
        type = Helper.getArrayKind(type);
        switch (type) {
            case 'Uint8Array':
                return `${name};`;
            case 'number':
            case 'enum':
                if (size === 1) {
                    return `Utils.uint8ToBuffer(${name});`;
                } else if (size === 2) {
                    return `Utils.uint16ToBuffer(${name});`;
                } else {
                    return `Utils.uint32ToBuffer(${name});`;
                }
            case 'bigint':
                return `Utils.bigIntToBuffer(${name});`;
            case 'enumArray':
                return `Utils.writeListEnum(${name}, 0);`;
            default:
                if (Helper.isArrayDisposition(disposition)) {
                    return `Utils.writeList(${name}, 0);`;
                }
                if (type.endsWith('Flags')) {
                    return `Utils.uint8ToBuffer(Utils.fromFlags(${type}, ${name}));`;
                }
                return `${name}.serialize();`;
        }
    }

    /**
     * Detect and add import names to a list
     * @param importList - existing import list
     * @param type - type
     * @param name - name
     */
    public static addRequiredImport(importList: string[], type: string, name: string): void {
        if (type !== name && !Helper.isByte(type) && !['Uint8Array', 'number', 'bigint'].includes(type)) {
            if (!importList.includes(type)) {
                importList.push(Helper.getArrayKind(type));
            }
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
     * @param isConstant - variable is constant
     * @returns should declare variable or not
     */
    public static shouldDeclareVariable(name: string, isConstant: boolean, layouts: Layout[]): boolean {
        if (isConstant) {
            return false;
        }
        if (name.endsWith('_count') || name.endsWith('_size')) {
            if (layouts.find((layout) => layout.size && layout.size === name)) {
                return false;
            }
            return true;
        }
        return !(name === 'size' || name.indexOf('_reserved') > -1);
    }

    /**
     * Write content into file
     * @param fileName - filename
     * @param fileContent - file content
     */
    public static writeToFile(fileName: string, destination: string, fileContent: string[], fileHeader: string[]): void {
        const writeStream = fs.createWriteStream(`${destination}/${fileName}`);
        fileHeader.forEach((line) => writeStream.write(`${line}\n`));
        fileContent.forEach((line) => writeStream.write(`${line}\n`));
        writeStream.on('finish', () => {
            console.log(`${fileName} has been generated.`);
        });
        writeStream.on('error', (err) => {
            throw err;
        });
        writeStream.end();
    }

    /**
     * Inject license boilerplate to an existing file content
     * @param fileContent - existing generated file content
     */
    public static getLicense(): string[] {
        const lines = new LineByLine(path.join(__dirname, './HEADER.inc'));
        let line: false | Buffer;
        const licenseLines: string[] = [];
        while ((line = lines.next())) {
            licenseLines.push(line.toString());
        }
        return licenseLines;
    }
}
