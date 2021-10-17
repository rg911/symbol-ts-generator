import * as fs from 'fs-extra';
import { BuildInType, ConditionType, DispositionType, GeneratedBuildInType } from './Enums';
import { Layout } from './interface/layout';
import { Parameter } from './interface/parameter';
import LineByLine = require('n-readlines');
import path = require('path');
export class Helper {
    public static ARRAY_TYPES = [
        DispositionType.Array.valueOf(),
        DispositionType.ArrayFill.valueOf(),
        DispositionType.ArraySized.valueOf(),
    ];

    public static GENERATED_BUILD_IN_TYPE = [
        GeneratedBuildInType.BigInt.valueOf(),
        GeneratedBuildInType.Number.valueOf(),
        GeneratedBuildInType.Uint8Array.valueOf(),
    ];

    /**
     * Classes which should not be generated
     */
    public static EXCLUDED_CLASS = ['SizePrefixedEntity', 'VerifiableEntity', 'EntityBody', 'EmbeddedTransactionHeader'];

    /**
     * Convert string name from snake_case, kebab-case, PascalCase to camel case.
     *
     * @param value - Input string
     * @returns camel case string
     */
    public static toCamel(value?: string): string {
        if (!value) {
            return '';
        }
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
     * @param disposition - layout attribute
     * @returns true if layout attribute is inline
     */
    public static isInline(disposition?: string): boolean {
        return disposition !== undefined && disposition === DispositionType.Inline.valueOf();
    }

    /**
     * Check if layout attribute is const
     * @param disposition - layout attribute
     * @returns true if layout attribute is const
     */
    public static isConst(disposition?: string): boolean {
        return disposition !== undefined && disposition === DispositionType.Const.valueOf();
    }

    /**
     * Check if layout attribute is array
     * @param disposition - layout disposition
     * @returns true if layout attribute is array
     */
    public static isArray(disposition?: string): boolean {
        return disposition !== undefined && Helper.ARRAY_TYPES.includes(disposition);
    }

    /**
     * Check if layout attribute is reserved
     * @param disposition - layout attribute
     * @returns true if layout attribute is reserved
     */
    public static isReserved(disposition?: string): boolean {
        return disposition !== undefined && disposition === DispositionType.Reserved.valueOf();
    }

    /**
     * Check if layout attribute is fill array
     * @param disposition - layout attribute
     * @returns true if layout attribute is fill array
     */
    public static isFillArray(disposition?: string): boolean {
        return disposition !== undefined && disposition === DispositionType.ArrayFill.valueOf();
    }

    /**
     * Check if layout attribute is sized array
     * @param disposition - layout attribute
     * @returns true if layout attribute is sized array
     */
    public static isSizedArray(disposition?: string): boolean {
        return disposition !== undefined && disposition === DispositionType.ArraySized.valueOf();
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
     * @param condition - condition attribute
     * @returns true if layout attribute is conditional
     */
    public static isConditional(condition?: string): boolean {
        return condition !== undefined;
    }

    /**
     * Check if layout attribute is equal kind condition
     * @param condition - condition attribute
     * @param operation - condition operation
     * @returns true if layout attribute is equal kind condition
     */
    public static isEqualKindCondition(condition?: string, operation?: string): boolean {
        return (
            operation !== undefined &&
            Helper.isConditional(condition) &&
            [ConditionType.Equals.valueOf(), ConditionType.NotEquals.valueOf()].includes(operation)
        );
    }

    /**
     * Check if layout attribute is array kind condition
     * @param condition - condition attribute
     * @param operation - condition operation
     * @returns true if layout attribute is array kind condition
     */
    public static isArrayKindCondition(condition?: string, operation?: string): boolean {
        return operation !== undefined && Helper.isConditional(condition) && operation === ConditionType.In.valueOf();
    }

    /**
     * Check if layout attribute is size condition
     * @param condition - condition attribute
     * @returns true if layout attribute is size condition
     */
    public static isSizeCondition(condition?: string): boolean {
        return condition !== undefined && condition?.endsWith('_size');
    }

    /**
     * Is EmbeddedTransaction type
     * @param type - parameter type
     * @returns if the parameter type is EmbeddedTransaction
     */
    public static isEmbeddedTransaction(type: string): boolean {
        return Helper.stripArrayType(type) === 'EmbeddedTransaction';
    }

    /**
     * get deserialize method array alignment
     * @param type - parameter type
     * @returns deserialize method array alignment
     */
    public static getArrayDeserializeAlignment(type: string): number {
        return Helper.stripArrayType(type) === 'EmbeddedTransaction' ? 8 : 0;
    }

    /**
     * Return base type of an array
     * @param arrayType - param array type
     */
    public static stripArrayType(arrayType: string): string {
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
        if (Helper.isArray(type) || Helper.isArray(disposition) || type.endsWith('Flags') || disposition?.endsWith('Flags')) {
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
        type = Helper.stripArrayType(type);
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
                    if (size === 1) {
                        return `Utils.toFlags(${type}, Utils.bufferToUint8(${argName}));`;
                    } else if (size === 2) {
                        return `Utils.toFlags(${type}, Utils.bufferToUint16(${argName}));`;
                    }
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
        type = Helper.stripArrayType(type);
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
            case 'arraySize':
                return `${name}.reduce((sum, c) => sum + Utils.getSizeWithPadding(c.size, ${size}), 0);`;
            default:
                if (Helper.isArray(disposition)) {
                    return `Utils.writeList(${name}, ${type === 'EmbeddedTransaction' ? '8' : '0'});`;
                }
                if (type.endsWith('Flags')) {
                    if (size === 1) {
                        return `Utils.uint8ToBuffer(Utils.fromFlags(${type}, ${name}));`;
                    } else if (size === 2) {
                        return `Utils.uint16ToBuffer(Utils.fromFlags(${type}, ${name}));`;
                    }
                    return `Utils.uint32ToBuffer(Utils.fromFlags(${type}, ${name}));`;
                }
                return `${name}.serialize();`;
        }
    }

    /**
     * Get condition lines based on condition operation type
     * @param param - current parameter
     * @param conditionParamType - condition parameter
     * @param localVar - is declaring local var or not
     * @returns typescript condition lines
     */
    public static getConditionLine(param: Parameter, conditionParamType: string, localVar = false): string {
        const varPrefix = localVar ? '' : 'this.';
        const value =
            conditionParamType === GeneratedBuildInType.Number ? param.condition_value : `${conditionParamType}.${param.condition_value}`;
        let varName = `${varPrefix}${Helper.toCamel(param.condition)}`;
        if (Helper.isSizeCondition(param.condition) && !param.actualSize) {
            if (Helper.shouldGenerateClass(param.type)) {
                varName = `${varPrefix}${param.generatedName}.size`;
            }
        }
        switch (param.condition_operation) {
            case ConditionType.In.valueOf():
                return `if (${varName}.indexOf(${value}) > -1) {`;
            case ConditionType.Equals.valueOf():
                return `if (${varName} === ${value}) {`;
            case ConditionType.NotEquals.valueOf():
                return `if (${varName} !== ${value}) {`;
            default:
                return '';
        }
    }

    /**
     * Detect and add import names to a list
     * @param importList - existing import list
     * @param type - type
     * @param name - name
     * @param disposition - disposition
     */
    public static addRequiredImport(importList: string[], type: string, name: string, disposition?: string): void {
        type = Helper.stripArrayType(type);
        if (type !== name && !Helper.isByte(type) && !Helper.isConst(disposition) && !Helper.GENERATED_BUILD_IN_TYPE.includes(type)) {
            if (!importList.includes(type)) {
                importList.push(type);
            }
        }
    }

    /**
     * Should generate class or not
     * @param name - class name
     * @returns should generate class or not
     */
    public static shouldGenerateClass(name: string): boolean {
        return !Helper.EXCLUDED_CLASS.includes(name);
    }

    /**
     * Get generated schema name
     * @param name - schema name
     * @param disposition - parameter disposition
     * @returns generated name
     */
    public static getGeneratedName(name?: string, disposition?: string): string {
        if (!name) {
            return '';
        }
        return Helper.isConst(disposition) ? name : Helper.toCamel(name); // Keep const name as it is
    }

    /**
     * Parameter comments sanitizer
     * @param name - param name
     * @param comments - param comments
     * @returns sanitized comments: if undefined use the param name
     */
    public static sanitizeComment(name: string, comments?: string): string {
        return comments ? comments : name;
    }

    /**
     * Should declare variable or not
     * @param name - name
     * @param disposition - parameter disposition
     * @returns should declare variable or not
     */
    public static shouldDeclareVariable(name: string, layouts: Layout[], disposition?: string): boolean {
        // ignore constant, reserved and size
        if (Helper.isConst(disposition) || Helper.isReserved(disposition) || name === 'size') {
            return false;
        }
        if (name.endsWith('_count') || name.endsWith('_size')) {
            if (layouts.find((layout) => layout.size && layout.size === name)) {
                return false;
            }
            return true;
        }
        return true;
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

    /**
     * Wrap declaration line if it is too long
     * @param prefix - prefix
     * @param body - body
     * @param suffix - suffix
     * @param baseIndentCount - parent indentation count
     * @returns wrapped declaration lines
     */
    public static wrapLines(prefix: string, body: string, suffix: string, baseIndentCount: number): string[] {
        const generatedLines: string[] = [];
        const singleLine = prefix + body + suffix;
        if (singleLine.length > 140) {
            Helper.writeLines(prefix.trimEnd(), generatedLines);
            Helper.writeLines(
                body.split(', ').map((line) => Helper.indent(line + ',', baseIndentCount + 1)),
                generatedLines,
            );
            Helper.writeLines(Helper.indent(suffix.trim(), baseIndentCount), generatedLines);
        } else {
            generatedLines.push(singleLine);
        }
        return generatedLines;
    }
}
