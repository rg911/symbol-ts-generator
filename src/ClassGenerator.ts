import { GeneratorBase } from './GeneratorBase';
import { Helper } from './Helper';
import { Parameter } from './interface/parameter';
import { Schema } from './interface/schema';
import { MethodGenerator } from './MethodGenerator';

export class ClassGenerator extends GeneratorBase {
    private generatedLines: string[];
    private methodGenerator: MethodGenerator;
    private classParameters: Parameter[];
    private importList: string[];

    /**
     * Constructor
     * @param classSchema - schema of the class to be generated
     * @param schema - schema list
     */
    constructor(public readonly classSchema: Schema, schema: Schema[]) {
        super(schema);
        this.generatedLines = [];
        this.methodGenerator = new MethodGenerator(classSchema, schema);
        this.classParameters = this.parseClassParameters();
        this.importList = ['Utils'];
    }

    /**
     * Generate class
     * @returns generated file content
     */
    public generate(): string[] {
        Helper.writeLines(this.generateImports(), this.generatedLines, true);
        Helper.writeLines(this.getClassHeader(this.classSchema), this.generatedLines);
        Helper.writeLines(this.generatePublicVariables(), this.generatedLines);
        Helper.writeLines(this.methodGenerator.generateConstructor(this.classParameters), this.generatedLines);
        Helper.writeLines(this.methodGenerator.generateDeserializer(this.classParameters), this.generatedLines);
        Helper.writeLines(this.methodGenerator.generateSizeGetter(this.classParameters), this.generatedLines);
        Helper.writeLines(this.methodGenerator.generateSerializer(this.classParameters), this.generatedLines);
        Helper.writeLines('}', this.generatedLines);
        return this.generatedLines;
    }

    private generatePublicVariables(): string[] {
        const generatedLines: string[] = [];
        this.classParameters.forEach((param) => {
            Helper.writeLines(this.generateComment(param.comments, 1), generatedLines);
            Helper.writeLines(Helper.indent(`public readonly ${param.name}: ${param.type};`, 1), generatedLines);
        });
        Helper.writeLines('', generatedLines);
        return generatedLines;
    }

    private parseClassParameters(): Parameter[] {
        const layout = this.classSchema.layout;
        if (layout && layout.length > 0) {
            return [];
        } else {
            return [this.generateSimpleClassParams()];
        }
    }

    private generateSimpleClassParams(): Parameter {
        const type = this.classSchema.type;
        return {
            name: Helper.toCamel(this.classSchema.name),
            type: Helper.isByte(type) ? Helper.convertByteType(this.classSchema.size) : type,
            comments: this.classSchema.comments ? this.classSchema.comments : this.classSchema.name,
            size: this.classSchema.size,
        };
    }

    private generateImports(): string[] {
        const lines: string[] = [];
        this.importList
            .sort((a, b) => a.localeCompare(b))
            .forEach((item) => {
                lines.push(`import { ${item} } from './${item}';`);
            });
        return lines;
    }
}
