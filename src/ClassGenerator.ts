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
        this.generateParameterInterface();
        Helper.writeLines(this.getClassHeader(this.classSchema), this.generatedLines);
        this.generatePublicVariables();
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
    private generatePublicVariables(): void {
        Helper.writeLines(this.generateParamTypePairLine('public readonly '), this.generatedLines, true);
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
            type: Helper.getGeneratedType(schemaType, this.classSchema.size),
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
            const paramSize = typeof layout.size === 'string' ? undefined : this.getRealLayoutSize(layout);
            layout.comments = layout.comments ? layout.comments : paramName;
            if (!layout.disposition) {
                layout.type = Helper.getGeneratedType(layout.type, paramSize, layout.disposition);
                params.push({
                    paramName,
                    paramSize,
                    declarable: Helper.shouldDeclareVariable(layout.name ?? ''),
                    ...layout,
                });
                Helper.addRequiredImport(this.importList, layout.type, paramName);
            } else {
                this.parseDispositionParam(layout, params);
            }
        });
        return params;
    }

    private parseDispositionParam(layout: Layout, params: Parameter[]) {
        if (Helper.isInline(layout) && !Helper.shouldGenerateClass(layout.type)) {
            const layouts = this.schema.find((schema) => schema.name === layout.type)?.layout;
            layouts?.forEach((ignoredParam) => {
                const paramSize = typeof ignoredParam.size === 'string' ? undefined : this.getRealLayoutSize(ignoredParam);
                const paramName = Helper.toCamel(ignoredParam.name ? ignoredParam.name : '');
                const param = {
                    paramName,
                    paramSize: typeof ignoredParam.size === 'string' ? undefined : ignoredParam.size,
                    declarable: Helper.shouldDeclareVariable(layout.name ?? ''),
                    ...ignoredParam,
                };
                param.type = Helper.getGeneratedType(ignoredParam.type, paramSize, ignoredParam.disposition);
                param.comments = ignoredParam.comments;
                params.push(param);
            });
        } else {
            const paramName = Helper.toCamel(layout.name ? layout.name : layout.type);
            const paramSize = typeof layout.size === 'string' ? undefined : this.getRealLayoutSize(layout);
            layout.comments = layout.comments ? layout.comments : paramName;
            Helper.addRequiredImport(this.importList, layout.type, paramName);
            const param = {
                paramName: Helper.toCamel(paramName),
                paramSize,
                declarable: Helper.shouldDeclareVariable(layout.name ?? ''),
                ...layout,
            };
            param.type = Helper.getGeneratedType(layout.type, paramSize, layout.disposition);
            param.comments = layout.comments ? layout.comments : paramName;
            params.push(param);
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

    private generateParameterInterface(): void {
        if (this.classParameters.length > 1) {
            Helper.writeLines(this.generateComment(`Interface to create instances of ${this.classSchema.name}`, 0), this.generatedLines);
            Helper.writeLines(`export interface ${this.classSchema.name}Params {`, this.generatedLines);
            Helper.writeLines(this.generateParamTypePairLine(''), this.generatedLines);
            Helper.writeLines('}', this.generatedLines, true);
        }
    }

    private generateParamTypePairLine(prefix: string): string[] {
        const generatedLines: string[] = [];
        this.classParameters
            .filter((param) => param.declarable)
            .forEach((param) => {
                if (param.declarable) {
                    Helper.writeLines(this.generateComment(param.comments, 1), generatedLines);
                    Helper.writeLines(
                        Helper.indent(`${prefix}${param.paramName}${param.condition ? '?' : ''}: ${param.type};`, 1),
                        generatedLines,
                    );
                }
            });
        return generatedLines;
    }
}
