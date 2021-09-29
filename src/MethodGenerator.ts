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
        Helper.writeLines(Helper.indent(`constructor(${this.getParamTypeLine(params)}) {`, 1), generatedLines);
        params.forEach((param) => {
            Helper.writeLines(Helper.indent(`this.${param.name} = ${param.name};`, 2), generatedLines);
        });
        Helper.writeLines(Helper.indent(`}`, 1), generatedLines, true);
        return generatedLines;
    }

    public generateSizeGetter(params: Parameter[]): string[] {
        const generatedLines: string[] = [];
        Helper.writeLines(this.generateComment('Gets the size of the object', 1, [], 'Size in bytes'), generatedLines);
        Helper.writeLines(Helper.indent(`public get size(): number {`, 1), generatedLines);
        if (params.length === 1) {
            Helper.writeLines(Helper.indent(`return ${params[0].size};`, 2), generatedLines);
        } else {
            Helper.writeLines(Helper.indent(`let size = 0;`, 2), generatedLines);
            params.forEach((param) => {
                Helper.writeLines(Helper.indent(`this.${param.name} = ${param.name};`, 2), generatedLines);
            });
        }
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
            Helper.indent(`return new ${this.classSchema.name}(${params.map((p) => Helper.toCamel(p.name)).join(', ')});`, 2),
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

    private getParamCommentLines(params: Parameter[]): string[] {
        const lines: string[] = [];
        params.forEach((param) => {
            Helper.writeLines(this.wrapComment(`@param ${param.name} - ${param.comments}`, 1), lines);
        });
        return lines;
    }

    private getParamTypeLine(params: Parameter[]): string {
        const paramTypePair = params.map((param) => {
            const convertedType = param.type;
            return `${param.name}: ${convertedType}`;
        });

        return paramTypePair.join(', ');
    }

    private getParamDeserializeLines(params: Parameter[]): string[] {
        const lines: string[] = [];
        if (params.length === 1) {
            const method = Helper.getDeserializeUtilMethodByType(params[0].type, 'payload', params[0].size);
            Helper.writeLines(Helper.indent(`const ${params[0].name} = ${method}`, 2), lines);
        }
        return lines;
    }

    private getParamSerializeLines(params: Parameter[]): string[] {
        const lines: string[] = [];
        if (params.length === 1) {
            const method = Helper.getSerializeUtilMethodByType(params[0].type, params[0].name, params[0].size);
            Helper.writeLines(Helper.indent(`return ${method}`, 2), lines);
        }
        return lines;
    }
}
