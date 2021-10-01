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

    public generateConstructor(params: Parameter[]): string[] {
        const generatedLines: string[] = [];
        Helper.writeLines(this.generateComment('Constructor', 1, this.getParamCommentLines(params)), generatedLines);
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
                ),
                generatedLines,
            );
        }
        params
            .filter((param) => param.declarable)
            .forEach((param) => {
                Helper.writeLines(Helper.indent(`this.${param.paramName} = ${param.paramName};`, 2), generatedLines);
            });

        Helper.writeLines(Helper.indent(`}`, 1), generatedLines, true);
        return generatedLines;
    }

    public generateSizeGetter(params: Parameter[]): string[] {
        const generatedLines: string[] = [];
        Helper.writeLines(this.generateComment('Gets the size of the object', 1, [], 'Size in bytes'), generatedLines);
        Helper.writeLines(Helper.indent(`public get size(): number {`, 1), generatedLines);
        Helper.writeLines(this.getGetterLines(params), generatedLines);
        Helper.writeLines(Helper.indent(`}`, 1), generatedLines, true);
        return generatedLines;
    }

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
        Helper.writeLines(Helper.indent(`public static deserialize(payload: Uint8Array): ${this.classSchema.name} {`, 1), generatedLines);
        Helper.writeLines(this.getParamDeserializeLines(params), generatedLines);
        Helper.writeLines(
            Helper.indent(`return new ${this.classSchema.name}(${params.map((p) => Helper.toCamel(p.paramName)).join(', ')});`, 2),
            generatedLines,
        );
        Helper.writeLines(Helper.indent(`}`, 1), generatedLines, true);
        return generatedLines;
    }

    public generateSerializer(params: Parameter[]): string[] {
        const generatedLines: string[] = [];
        Helper.writeLines(this.generateComment('Serializes an object to bytes', 1, [], 'Serialized bytes'), generatedLines);
        Helper.writeLines(Helper.indent(`public serialize(): Uint8Array {`, 1), generatedLines);
        Helper.writeLines(this.getParamSerializeLines(params), generatedLines);
        Helper.writeLines(Helper.indent(`}`, 1), generatedLines);
        return generatedLines;
    }

    //#region Private Methods
    private getParamCommentLines(params: Parameter[]): string[] {
        const lines: string[] = [];
        params
            .filter((param) => param.declarable)
            .forEach((param) => {
                Helper.writeLines(this.wrapComment(`@param ${param.paramName} - ${param.comments}`, 1), lines);
            });
        return lines;
    }

    private getGetterLines(params: Parameter[]): string[] {
        const generatedLines: string[] = [];
        if (params.length === 1) {
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
                if (Helper.isArrayDisposition(param.disposition)) {
                    const sizeMethod = param.element_disposition
                        ? '.length'
                        : '.reduce((sum, c) => sum + Utils.getSizeWithPadding(c.size, 0), 0)';
                    sizeLine = `this.${Helper.toCamel(param.name ?? '')}${sizeMethod}`;
                }
                Helper.writeLines(this.applyCondition(param, params, [`size += ${sizeLine}; // ${param.paramName};`], 2), generatedLines);
            });
            Helper.writeLines(Helper.indent(`return size;`, 2), generatedLines);
        }
        return generatedLines;
    }

    private getParamDeserializeLines(params: Parameter[]): string[] {
        const lines: string[] = [];
        if (params.length === 1) {
            const method = Helper.getDeserializeUtilMethodByType(params[0].type, 'payload', params[0].paramSize);
            Helper.writeLines(Helper.indent(`const ${params[0].paramName} = ${method}`, 2), lines);
        }
        return lines;
    }

    private getParamSerializeLines(params: Parameter[]): string[] {
        const generatedLines: string[] = [];
        if (params.length === 1) {
            const method = Helper.getSerializeUtilMethodByType(params[0].type, 'this.' + params[0].paramName, params[0].paramSize);
            Helper.writeLines(Helper.indent(`return ${method}`, 2), generatedLines);
        } else {
            Helper.writeLines(Helper.indent(`let newArray = new Uint8Array();`, 2), generatedLines);
            params.forEach((param) => {
                const bodyLines: string[] = [];
                // Handle size / count
                let name = `this.${param.paramName}${param.condition ? '!' : ''}`.replace('Size', '.length').replace('Count', '.length');
                // Handle reserved field
                if (param.disposition && param.disposition === 'reserved') {
                    name = param.value as string;
                }
                // Handle enum
                let type = param.type;
                const parentSchema = this.schema.find((schema) => schema.name === param.type);
                if (parentSchema && Helper.isEnum(parentSchema.type)) {
                    type = 'enum';
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

    private applyCondition(param: Parameter, params: Parameter[], bodyLines: string[], indentCount: number): string[] {
        const lines: string[] = [];
        if (param.condition) {
            const conditionType = params
                .find((condition) => condition.name && condition.name === param.condition)
                ?.type.replace('[', '')
                .replace(']', '');
            let conditionLine = '';
            if (param.condition_operation === 'in') {
                conditionLine = `if (this.${Helper.toCamel(param.condition ?? '')}.indexOf(${conditionType}.${
                    param.condition_value
                }) > -1) {`;
            } else {
                conditionLine = `if (this.${Helper.toCamel(param.condition ?? '')} === ${conditionType}.${param.condition_value}) {`;
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

    private wrapMethodDeclarationLines(prefix: string, body: string, suffix: string): string[] {
        const generatedLines: string[] = [];
        const singleLine = prefix + body + suffix;
        if (singleLine.length > 140) {
            Helper.writeLines(prefix.trimEnd(), generatedLines);
            Helper.writeLines(
                body.split(', ').map((line) => Helper.indent(line + ',', 2)),
                generatedLines,
            );
            Helper.writeLines(Helper.indent(suffix.trim(), 1), generatedLines);
        } else {
            generatedLines.push(singleLine);
        }
        return generatedLines;
    }
    //#endregion Private Methods
}
