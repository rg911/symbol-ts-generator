import { GeneratorBase } from './GeneratorBase';
import { Helper } from './Helper';
import { Layout } from './interface/layout';
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
        this.importList = ['Utils', 'Serializer'];
        this.generatedLines = [];
        this.methodGenerator = new MethodGenerator(classSchema, schema);
        this.classParameters = this.parseClassParameters();
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

    /**
     * Generate a list of public variable declaration statements
     * @returns list of public variables
     */
    private generatePublicVariables(): string[] {
        const generatedLines: string[] = [];
        this.classParameters.forEach((param) => {
            if (param.declarable) {
                Helper.writeLines(this.generateComment(param.comments, 1), generatedLines);
                Helper.writeLines(Helper.indent(`public readonly ${param.paramName}: ${param.type};`, 1), generatedLines);
            }
        });
        Helper.writeLines('', generatedLines);
        return generatedLines;
    }

    /**
     * Parse class parameter from class schema
     * @returns parsed parameters
     */
    private parseClassParameters(): Parameter[] {
        const layout = this.classSchema.layout;
        if (layout && layout.length > 0) {
            return this.generateLayoutClassParams();
        } else {
            return [this.generateSimpleClassParams()];
        }
    }

    /**
     * Generate simple parameter which does not have layout
     * @returns prepared parameter
     */
    private generateSimpleClassParams(): Parameter {
        const schemaType = this.classSchema.type;
        Helper.addRequiredImport(this.importList, this.classSchema.type, this.classSchema.name);
        return {
            paramName: Helper.toCamel(this.classSchema.name),
            type: Helper.isByte(schemaType) ? Helper.convertByteType(this.classSchema.size) : schemaType,
            comments: this.classSchema.comments ? this.classSchema.comments : this.classSchema.name,
            paramSize: this.classSchema.size,
            declarable: true,
        };
    }

    /**
     * Generate list of layout parameters
     * @returns prepared parameters
     */
    private generateLayoutClassParams(): Parameter[] {
        const params: Parameter[] = [];
        this.classSchema.layout.forEach((layout) => {
            const paramName = Helper.toCamel(layout.name ? layout.name : '');
            const paramSize = typeof layout.size === 'string' ? undefined : layout.size;
            layout.comments = layout.comments ? layout.comments : paramName;

            if (!layout.disposition) {
                layout.type = Helper.isByte(layout.type) ? Helper.convertByteType(paramSize) : layout.type;
                params.push({ paramName, paramSize, declarable: true, ...layout });
                Helper.addRequiredImport(this.importList, layout.type, paramName);
            } else {
                this.parseDispositionParam(layout, params);
            }
        });
        return params;
    }

    private parseDispositionParam(layout: Layout, params: Parameter[]) {
        if (Helper.isInline(layout)) {
            if (!Helper.shouldGenerateClass(layout.type)) {
                const layouts = this.schema.find((schema) => schema.name === layout.type)?.layout;
                layouts?.forEach((ignoredParam) => {
                    const paramSize = typeof ignoredParam.size === 'string' ? undefined : ignoredParam.size;
                    const type = Helper.isByte(ignoredParam.type) ? Helper.convertByteType(paramSize) : ignoredParam.type;
                    const paramName = Helper.toCamel(ignoredParam.name ? ignoredParam.name : '');
                    params.push({
                        paramName,
                        type,
                        comments: ignoredParam.comments,
                        paramSize: typeof ignoredParam.size === 'string' ? undefined : ignoredParam.size,
                        declarable: false,
                    });
                });
            } else {
                const paramName = Helper.toCamel(layout.name ? layout.name : layout.type);
                const paramSize = typeof layout.size === 'string' ? undefined : layout.size;
                layout.comments = layout.comments ? layout.comments : paramName;
                Helper.addRequiredImport(this.importList, layout.type, paramName);
                params.push({
                    paramName: Helper.toCamel(paramName),
                    type: Helper.isByte(layout.type) ? Helper.convertByteType(paramSize) : layout.type,
                    comments: layout.comments ? layout.comments : paramName,
                    paramSize: typeof layout.size === 'string' ? undefined : layout.size,
                    declarable: true,
                });
            }
        }
    }

    /**
     * Get the list of import statements
     * @returns import name list
     */
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
