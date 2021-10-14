import { GeneratorBase } from './GeneratorBase';
import { Helper } from './Helper';
import { Parameter } from './interface/parameter';
import { Schema } from './interface/schema';

export class MethodGenerator extends GeneratorBase {
    /**
     * Constructor
     * @param classSchema - schema of the method to be generated
     * @param schema - schema list
     */
    constructor(public readonly classSchema: Schema, schema: Schema[]) {
        super(schema);
    }

    /**
     * Generate constructor
     * @param params - parameter list
     * @returns generated constructor lines
     */
    public generateConstructor(params: Parameter[]): string[] {
        const generatedLines: string[] = [];
        Helper.writeLines(this.generateComment('Constructor', 1, this.getParamCommentLines(params)), generatedLines);
        // Constructor header
        if (params.length === 1) {
            Helper.writeLines(Helper.indent(`constructor(${params[0].paramName}: ${params[0].type}) {`, 1), generatedLines);
        } else {
            Helper.writeLines(
                this.wrapMethodDeclarationLines(
                    Helper.indent('constructor({ ', 1),
                    params
                        .filter((param) => param.declarable)
                        .map((param) => param.paramName)
                        .join(', '),
                    ` }: ${this.classSchema.name}Params) {`,
                    1,
                ),
                generatedLines,
            );
        }
        // Constructor params
        params
            .filter((param) => param.declarable)
            .forEach((param) => {
                Helper.writeLines(Helper.indent(`this.${param.paramName} = ${param.paramName};`, 2), generatedLines);
            });

        Helper.writeLines(Helper.indent(`}`, 1), generatedLines, true);
        return generatedLines;
    }

    /**
     * Generate size getter
     * @param params - parameter list
     * @returns generated size getter lines
     */
    public generateSizeGetter(params: Parameter[]): string[] {
        const generatedLines: string[] = [];
        Helper.writeLines(this.generateComment('Gets the size of the object', 1, [], 'Size in bytes'), generatedLines);
        Helper.writeLines(Helper.indent(`public get size(): number {`, 1), generatedLines);
        Helper.writeLines(this.getGetterLines(params), generatedLines);
        Helper.writeLines(Helper.indent(`}`, 1), generatedLines, true);
        return generatedLines;
    }

    /**
     * Generate deserializer
     * @param params - parameter list
     * @returns generated deserializer lines
     */
    public generateDeserializer(params: Parameter[]): string[] {
        const generatedLines: string[] = [];
        Helper.writeLines(
            this.generateComment(
                `Creates an instance of ${this.classSchema.name} from binary payload`,
                1,
                this.wrapComment(`@param payload - byte payload to use to serialize the object`, 1),
                `Instance of ${this.classSchema.name}`,
            ),
            generatedLines,
        );
        // Deserializer header
        Helper.writeLines(Helper.indent(`public static deserialize(payload: Uint8Array): ${this.classSchema.name} {`, 1), generatedLines);
        // Deserializer body
        Helper.writeLines(this.getParamDeserializeLines(params), generatedLines);
        // Returns
        if (params.length == 1) {
            Helper.writeLines(
                Helper.indent(`return new ${this.classSchema.name}(${params.map((p) => Helper.toCamel(p.paramName)).join(', ')});`, 2),
                generatedLines,
            );
        } else {
            Helper.writeLines(
                this.wrapMethodDeclarationLines(
                    Helper.indent(`return new ${this.classSchema.name}({ `, 2),
                    params
                        .filter((param) => param.declarable)
                        .map((param) => `${param.paramName}: ${param.paramName}`)
                        .join(', '),
                    ' });',
                    2,
                ),
                generatedLines,
            );
        }
        Helper.writeLines(Helper.indent(`}`, 1), generatedLines, true);
        return generatedLines;
    }

    /**
     * Generate serializer
     * @param params - parameter list
     * @returns generated serializer lines
     */
    public generateSerializer(params: Parameter[]): string[] {
        const generatedLines: string[] = [];
        Helper.writeLines(this.generateComment('Serializes an object to bytes', 1, [], 'Serialized bytes'), generatedLines);
        Helper.writeLines(Helper.indent(`public serialize(): Uint8Array {`, 1), generatedLines);
        Helper.writeLines(this.getParamSerializeLines(params), generatedLines);
        Helper.writeLines(Helper.indent(`}`, 1), generatedLines);
        return generatedLines;
    }

    //#region Private Methods
    /**
     * Generate parameter comment line
     * @param params - parameter list
     * @returns generated comments
     */
    private getParamCommentLines(params: Parameter[]): string[] {
        const lines: string[] = [];
        params
            .filter((param) => param.declarable)
            .forEach((param) => {
                Helper.writeLines(this.wrapComment(`@param ${param.paramName} - ${param.comments}`, 1), lines);
            });
        return lines;
    }

    /**
     * Generate size getter lines
     * @param params - parameter list
     * @returns generated size getter lines
     */
    private getGetterLines(params: Parameter[]): string[] {
        const generatedLines: string[] = [];
        if (params.length === 1 && !params[0].disposition?.endsWith('array')) {
            Helper.writeLines(Helper.indent(`return ${params[0].paramSize};`, 2), generatedLines);
        } else {
            Helper.writeLines(Helper.indent(`let size = 0;`, 2), generatedLines);
            let sizeLine = '';
            params.forEach((param) => {
                if (!param.paramSize) {
                    if (Helper.shouldGenerateClass(param.type)) {
                        sizeLine = `this.${param.paramName}${param.condition ? '!' : ''}.size`;
                    }
                } else {
                    sizeLine = param.paramSize.toString();
                }
                // Handle arrays
                if (Helper.isArrayDisposition(param.disposition)) {
                    let sizeMethod = param.element_disposition
                        ? '.length'
                        : '.reduce((sum, c) => sum + Utils.getSizeWithPadding(c.size, 0), 0)';
                    // Check enum array
                    const parentSchema = this.schema.find((schema) => schema.name === Helper.getArrayKind(param.type));
                    if (parentSchema && Helper.isEnum(parentSchema.type)) {
                        sizeMethod = `.reduce((sum) => sum + ${parentSchema.size}, 0)`;
                    }

                    sizeLine = `this.${Helper.toCamel(param.name ?? '')}${sizeMethod}`;
                }
                Helper.writeLines(this.applyCondition(param, params, [`size += ${sizeLine}; // ${param.paramName};`], 2), generatedLines);
            });
            Helper.writeLines(Helper.indent(`return size;`, 2), generatedLines);
        }
        return generatedLines;
    }

    /**
     * Generate deserializer lines
     * @param params - param list
     * @returns generated deserializer lines
     */
    private getParamDeserializeLines(params: Parameter[]): string[] {
        const generatedLines: string[] = [];
        let argument = 'Uint8Array.from(payload)';
        if (params.length === 1 && !params[0].disposition?.endsWith('array')) {
            const method = Helper.getDeserializeUtilMethodByType(params[0].type, argument, params[0].paramSize);
            Helper.writeLines(Helper.indent(`const ${params[0].paramName} = ${method}`, 2), generatedLines);
        } else {
            Helper.writeLines(Helper.indent(`const byteArray = Array.from(payload);`, 2), generatedLines);
            const appliedPlaceholder: string[] = [];
            const bottomConditionLines: string[] = [];
            params.forEach((param) => {
                const bodyLines: string[] = [];
                let spliceLines = [`byteArray.splice(0, ${param.paramSize === undefined ? `${param.paramName}.size` : param.paramSize});`];
                const parentSchema = this.schema.find((schema) => schema.name === param.type);
                argument = 'Uint8Array.from(byteArray)';
                // Handle enum
                const type = parentSchema && Helper.isEnum(parentSchema.type) ? 'enum' : param.type;
                const method = Helper.getDeserializeUtilMethodByType(type, argument, param.paramSize);

                //Handle array
                let bodyLine = [`${param.condition ? '' : 'const '}${param.paramName} = ${method}`];
                if ((param.disposition && param.disposition === 'reserved') || Helper.isConst(param)) {
                    bodyLine = [method];
                }
                if (Helper.isArrayDisposition(param.disposition)) {
                    let reduceLine = `${param.paramName}.reduce((sum, c) => sum + c.size, 0),`;
                    if (Helper.isFillArray(param)) {
                        bodyLine = [`const ${param.paramName} = Utils.deserializeRemaining(`];
                        bodyLine.push(Helper.indent(`${Helper.getArrayKind(param.type)}.deserialize,`, 1));
                        bodyLine.push(Helper.indent('Uint8Array.from(byteArray),', 1));
                        bodyLine.push(Helper.indent('byteArray.length,', 1));
                        bodyLine.push(Helper.indent('0,', 1));
                        bodyLine.push(');');
                        reduceLine = `${param.paramName}.reduce((sum, c) => sum + Utils.getSizeWithPadding(c.size, 0), 0),`;
                    } else if (param.size) {
                        if (param.type === 'Uint8Array') {
                            bodyLine = [
                                `const ${param.paramName} = Utils.getBytes(Uint8Array.from(byteArray), ${Helper.toCamel(
                                    param.size?.toString(),
                                )});`,
                            ];
                            reduceLine = `${Helper.toCamel(param.size?.toString())},`;
                        } else {
                            const parentSchema = this.schema.find((schema) => schema.name === Helper.getArrayKind(param.type));
                            if (parentSchema && Helper.isEnum(parentSchema.type)) {
                                bodyLine = [`const ${param.paramName} = Utils.deserializeEnums(`];
                                bodyLine.push(Helper.indent('Uint8Array.from(byteArray),', 1));
                                bodyLine.push(Helper.indent(`${Helper.toCamel(param.size?.toString())},`, 1));
                                bodyLine.push(Helper.indent(`${parentSchema.size},`, 1));
                                bodyLine.push(');');
                                reduceLine = `${param.paramName}.reduce((sum) => sum + ${parentSchema.size}, 0),`;
                            } else {
                                bodyLine = [`const ${param.paramName} = Utils.deserialize(`];
                                bodyLine.push(Helper.indent(`${Helper.getArrayKind(param.type)}.deserialize,`, 1));
                                bodyLine.push(Helper.indent('Uint8Array.from(byteArray),', 1));
                                bodyLine.push(Helper.indent(`${Helper.toCamel(param.size?.toString())},`, 1));
                                bodyLine.push(');');
                            }
                        }
                    }
                    const arraySpliceLine: string[] = [];
                    arraySpliceLine.push('byteArray.splice(');
                    arraySpliceLine.push(Helper.indent('0,', 1));
                    arraySpliceLine.push(Helper.indent(reduceLine, 1));
                    arraySpliceLine.push(');');
                    spliceLines = arraySpliceLine;
                }

                if (this.checkIfPlaceholderConditionLineNeeded(param, params)) {
                    if (!appliedPlaceholder.find((placeholder) => placeholder === param.condition)) {
                        Helper.writeLines(this.getDeserializeConditionPlaceHolder(param), generatedLines);
                        appliedPlaceholder.push(param.condition ?? '');
                    }

                    bottomConditionLines.push(
                        ...this.getBottomConditionBodyLines(param, params, Helper.toCamel(param.condition ?? '') + 'Bytes'),
                    );
                } else {
                    Helper.writeLines(bodyLine, bodyLines);
                    Helper.writeLines(spliceLines, bodyLines);
                    Helper.writeLines(this.applyCondition(param, params, bodyLines, 2, true, true), generatedLines);
                }
            });
            generatedLines.push(...bottomConditionLines);
        }
        return generatedLines;
    }

    /**
     * Generate serializer lines
     * @param params - parameter list
     * @returns generated serializer lines
     */
    private getParamSerializeLines(params: Parameter[]): string[] {
        const generatedLines: string[] = [];
        if (params.length === 1 && !params[0].disposition?.endsWith('array')) {
            const method = Helper.getSerializeUtilMethodByType(params[0].type, 'this.' + params[0].paramName, params[0].paramSize);
            Helper.writeLines(Helper.indent(`return ${method}`, 2), generatedLines);
        } else {
            Helper.writeLines(Helper.indent(`let newArray = new Uint8Array();`, 2), generatedLines);
            params.forEach((param) => {
                const bodyLines: string[] = [];
                let name = `this.${param.paramName}${param.condition ? '!' : ''}`;
                if (name.endsWith('Size')) {
                    name = name.replace('Size', '.length').replace('Count', '.length');
                }
                // Handle reserved field
                if (param.disposition && param.disposition === 'reserved') {
                    name = param.value as string;
                }
                // Handle size / count
                if (param.name?.endsWith('_size') || param.name?.endsWith('_count')) {
                    const parentParam = params.find((parent) => param.name && parent.size === param.name);

                    if (parentParam) {
                        name = `this.${parentParam.paramName}${param.condition ? '!' : ''}.length`;
                    }
                }

                // Handle enum & array
                let type = param.type;
                const parentSchema = this.schema.find((schema) => schema.name === Helper.getArrayKind(param.type));
                if (parentSchema && Helper.isEnum(parentSchema.type)) {
                    if (!Helper.getArrayKind(param.type).endsWith('Flags')) {
                        type = 'enum';
                    }
                    if (param.disposition && Helper.isArrayDisposition(param.disposition)) {
                        type = 'enumArray';
                    }
                }

                const method = Helper.getSerializeUtilMethodByType(type, name, param.paramSize, param.disposition);
                Helper.writeLines(`const ${param.paramName}Bytes = ${method}`, bodyLines);
                Helper.writeLines(`newArray = Utils.concatTypedArrays(newArray, ${param.paramName}Bytes);`, bodyLines);
                Helper.writeLines(this.applyCondition(param, params, bodyLines, 2), generatedLines);
            });
            Helper.writeLines(Helper.indent(`return newArray;`, 2), generatedLines);
        }
        return generatedLines;
    }

    /**
     * Apply conditions
     * @param param - condition param
     * @param params - parameter list
     * @param bodyLines - condition body lines
     * @param indentCount - indentation count
     * @param useLocal - is using local var
     * @param declareUndefined - declare undefined var
     * @returns generate condition lines
     */
    private applyCondition(
        param: Parameter,
        params: Parameter[],
        bodyLines: string[],
        indentCount: number,
        useLocal = false,
        declareUndefined = false,
    ): string[] {
        const lines: string[] = [];
        const accessor = useLocal ? '' : 'this.'; // Use local/global var
        if (param.condition) {
            const conditionType = params
                .find((condition) => condition.name && condition.name === param.condition)
                ?.type.replace('[', '')
                .replace(']', '');
            let conditionLine = '';
            const conditionValue = conditionType === 'number' ? param.condition_value : `${conditionType}.${param.condition_value}`;
            let conditionLeftPart = `${accessor}${Helper.toCamel(param.condition ?? '')}`;
            if (param.condition.endsWith('_size') && !param.paramSize) {
                if (Helper.shouldGenerateClass(param.type)) {
                    conditionLeftPart = `${accessor}${param.paramName}.size`;
                }
            }
            if (param.condition_operation === 'in') {
                conditionLine = `if (${conditionLeftPart}.indexOf(${conditionValue}) > -1) {`;
            } else if (param.condition_operation === 'equals') {
                conditionLine = `if (${conditionLeftPart} === ${conditionValue}) {`;
            } else if (param.condition_operation === 'not equals') {
                conditionLine = `if (${conditionLeftPart} !== ${conditionValue}) {`;
            }

            if (declareUndefined) {
                Helper.writeLines(Helper.indent(`let ${param.paramName}: ${param.type} | undefined;`, indentCount), lines);
            }
            Helper.writeLines(Helper.indent(conditionLine, indentCount), lines);
            bodyLines.forEach((line) => {
                Helper.writeLines(Helper.indent(line, indentCount + 1), lines);
            });
            Helper.writeLines(Helper.indent('}', indentCount), lines);
        } else {
            bodyLines.forEach((line) => {
                Helper.writeLines(Helper.indent(line, indentCount), lines);
            });
        }
        return lines;
    }

    /**
     * Wrap declaration line if it is too long
     * @param prefix - prefix
     * @param body - body
     * @param suffix - suffix
     * @param baseIndentCount - parent indentation count
     * @returns wrapped declaration lines
     */
    private wrapMethodDeclarationLines(prefix: string, body: string, suffix: string, baseIndentCount: number): string[] {
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

    /**
     * Check is a place holder line is needed for condition params
     * @param param - parameter
     * @param params - parameter list
     * @returns True or False if a placeholder line is needed
     */
    private checkIfPlaceholderConditionLineNeeded(param: Parameter, params: Parameter[]): boolean {
        if (param.condition && param.condition_operation && param.condition_operation.endsWith('equals')) {
            const paramIndex = params.findIndex((p) => p.name === param.name);
            const conditionVarIndex = params.findIndex((p) => p.name === param.condition);
            return paramIndex < conditionVarIndex;
        }
        return false;
    }

    /**
     * Get the placeholder for conditional lines
     * @param param - parameter
     * @returns place holder lines
     */
    private getDeserializeConditionPlaceHolder(param: Parameter): string[] {
        if (param.condition && param.condition_operation?.endsWith('equals')) {
            const paramName = Helper.toCamel(param.condition) + 'Bytes';
            const parentParam = this.schema.find((schema) => schema.name === param.type);
            if (parentParam) {
                return [
                    Helper.indent(
                        `const ${paramName} = ${Helper.getDeserializeUtilMethodByType(
                            'Uint8Array',
                            'Uint8Array.from(byteArray)',
                            parentParam.size,
                        )};`,
                        2,
                    ),
                    Helper.indent(`byteArray.splice(0, ${parentParam.size});`, 2),
                ];
            }
        }
        return [];
    }

    /**
     * Get the condition lines which will be placed at the bottom of the method body
     * @param param - parameter
     * @param params - parameter list
     * @param placeHolderName - place holder name string
     * @returns condition lines block
     */
    private getBottomConditionBodyLines(param: Parameter, params: Parameter[], placeHolderName: string): string[] {
        const bodyLines = [`${param.paramName} = ${param.type}.deserialize(${placeHolderName});`];
        return this.applyCondition(param, params, bodyLines, 2, true, true);
    }
    //#endregion Private Methods
}
