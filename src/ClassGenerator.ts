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
    private flatInlineParameters: Parameter[];
    private superClassLayout: Layout | undefined;

    /**
     * Constructor
     * @param classSchema - schema of the class to be generated
     * @param schema - schema list
     */
    constructor(public readonly classSchema: Schema, schema: Schema[]) {
        super(schema);
        this.importList = ['Utils', 'Serializer'];
        this.generatedLines = [];
        this.classParameters = this.parseClassParameters(classSchema);
        this.flatInlineParameters = this.flattenedParameters();
        this.superClassLayout = this.getSuperClass();
        this.methodGenerator = new MethodGenerator(classSchema, schema, this.flatInlineParameters);
    }

    /**
     * Generate class
     * @returns generated file content
     */
    public generate(): string[] {
        Helper.writeLines(this.generateImports(), this.generatedLines, true);
        this.generateParameterInterface();
        Helper.writeLines(this.getClassHeader(this.classSchema, this.superClassLayout?.type), this.generatedLines);
        this.generatePublicVariables();
        Helper.writeLines(this.methodGenerator.generateConstructor(this.classParameters, this.superClassLayout?.type), this.generatedLines);
        Helper.writeLines(
            this.methodGenerator.generateDeserializer(this.classParameters, this.superClassLayout?.type),
            this.generatedLines,
        );
        Helper.writeLines(this.methodGenerator.generateSizeGetter(this.classParameters, this.superClassLayout?.type), this.generatedLines);
        Helper.writeLines(this.methodGenerator.generateSerializer(this.classParameters, this.superClassLayout?.type), this.generatedLines);
        Helper.writeLines('}', this.generatedLines);
        return this.generatedLines;
    }

    /**
     * Generate a list of public variable declaration statements
     * @returns list of public variables
     */
    private generatePublicVariables(): void {
        this.generateConstant();
        Helper.writeLines(this.generateParamTypePairLine('public readonly '), this.generatedLines, true);
    }

    /**
     * Parse class parameter from class schema
     * @param schema - class schema
     * @returns parsed parameters
     */
    private parseClassParameters(schema: Schema): Parameter[] {
        if (schema.layout) {
            return this.generateLayoutClassParams(schema);
        } else {
            return [this.generateSimpleClassParams(schema)];
        }
    }

    /**
     * Generate simple parameter which does not have layout
     * @param schema - class schema
     * @returns prepared parameter
     */
    private generateSimpleClassParams(schema: Schema): Parameter {
        const schemaType = schema.type;
        Helper.addRequiredImport(this.importList, schema.type, schema.name);
        return {
            paramName: Helper.toCamel(schema.name),
            type: Helper.getGeneratedType(schemaType, schema.size),
            comments: schema.comments ? schema.comments : schema.name,
            paramSize: schema.size,
            declarable: true,
            inlineClass: '',
        };
    }

    /**
     * Generate list of layout parameters
     * @param schema - class schema
     * @returns prepared parameters
     */
    private generateLayoutClassParams(schema: Schema): Parameter[] {
        const params: Parameter[] = [];
        schema.layout.forEach((layout) => {
            layout.name = layout.name ? layout.name : '';
            const paramName = Helper.isConst(layout) ? layout.name : Helper.toCamel(layout.name); // Keep const name as it is
            const paramSize = typeof layout.size === 'string' ? undefined : this.getRealLayoutSize(layout);
            layout.comments = layout.comments ? layout.comments : paramName;
            if (!layout.disposition) {
                layout.type = Helper.getGeneratedType(layout.type, paramSize, layout.disposition);
                params.push({
                    paramName,
                    paramSize,
                    declarable: Helper.shouldDeclareVariable(layout.name, Helper.isConst(layout), schema.layout),
                    inlineClass: '',
                    ...layout,
                });
                Helper.addRequiredImport(this.importList, layout.type, paramName);
            } else {
                this.parseDispositionParam(schema, layout, params);
            }
        });
        return params;
    }

    /**
     * parse disposition type parameter
     * @param schema - class schema
     * @param layout - schema layout
     * @param params - parameter list
     */
    private parseDispositionParam(schema: Schema, layout: Layout, params: Parameter[]) {
        if (Helper.isInline(layout) && !Helper.shouldGenerateClass(layout.type)) {
            this.parseInlineLayout(layout, params);
        } else {
            layout.name = layout.name ? layout.name : layout.type;
            const isConst = Helper.isConst(layout);
            const paramName = isConst ? layout.name : Helper.toCamel(layout.name);
            const paramSize = typeof layout.size === 'string' ? undefined : this.getRealLayoutSize(layout);
            layout.comments = layout.comments ? layout.comments : paramName;
            const param = {
                paramName: paramName,
                paramSize,
                declarable: Helper.shouldDeclareVariable(layout.name, isConst, schema.layout),
                inlineClass: '',
                ...layout,
            };
            param.type = Helper.getGeneratedType(layout.type, paramSize, layout.disposition);
            param.comments = layout.comments ? layout.comments : paramName;
            if (layout.name === 'network') {
                console.log(param);
            }
            params.push(param);
            if (!isConst) {
                Helper.addRequiredImport(this.importList, layout.type, paramName);
            }
        }
    }

    private parseInlineLayout(layout: Layout, params: Parameter[]) {
        const schema = this.schema.find((schema) => schema.name === layout.type);
        if (schema && schema.layout.length > 0) {
            schema.layout.forEach((param) => {
                if (Helper.isInline(param)) {
                    this.parseInlineLayout(param, params);
                } else {
                    const paramSize = typeof param.size === 'string' ? undefined : this.getRealLayoutSize(param);
                    const paramName = Helper.toCamel(param.name ? param.name : '');
                    const parsedParam = {
                        paramName,
                        paramSize,
                        declarable: Helper.shouldDeclareVariable(param.name ?? '', Helper.isConst(param), schema.layout),
                        inlineClass: '',
                        ...param,
                    };
                    parsedParam.type = Helper.getGeneratedType(param.type, paramSize, param.disposition);
                    parsedParam.comments = param.comments;
                    params.push(parsedParam);
                    Helper.addRequiredImport(this.importList, parsedParam.type, paramName);
                }
            });
        }
    }

    /**
     * Get the list of import statements
     * @returns import name list
     */
    private generateImports(): string[] {
        const lines: string[] = [];
        if (this.classSchema.name === 'AggregateTransactionBody') {
            this.importList.push('EmbeddedTransactionHelper');
        }
        this.importList
            .sort((a, b) => a.localeCompare(b))
            .forEach((item) => {
                lines.push(`import { ${item} } from './${item}';`);
            });
        return lines;
    }

    /**
     * Generate parameter interface
     */
    private generateParameterInterface(): void {
        if (this.classParameters.length > 1) {
            Helper.writeLines(this.generateComment(`Interface to create instances of ${this.classSchema.name}`, 0), this.generatedLines);
            Helper.writeLines(`export interface ${this.classSchema.name}Params {`, this.generatedLines);
            this.flatInlineParameters.forEach((param) => {
                Helper.writeLines(this.generateComment(param.comments, 1), this.generatedLines);
                Helper.writeLines(Helper.indent(`${param.paramName}${param.condition ? '?' : ''}: ${param.type};`, 1), this.generatedLines);
            });
            Helper.writeLines('}', this.generatedLines, true);
        }
    }

    /**
     * Get flattened parameter list
     * @returns flattened parameter list if inline disposition exists
     */
    private flattenedParameters(): Parameter[] {
        const parameters: Parameter[] = [];
        this.classParameters.forEach((param) => {
            if (param.disposition && param.disposition === 'inline') {
                const inlineSchema = this.schema.find((schema) => schema.name === param.type);
                if (inlineSchema) {
                    this.recursivelyParseInlineParameters(inlineSchema, param.type, parameters);
                }
            } else {
                if (param.declarable) {
                    parameters.push(param);
                    Helper.addRequiredImport(this.importList, param.type, param.paramName);
                }
            }
        });
        return parameters;
    }

    private recursivelyParseInlineParameters(classSchema: Schema, inlineClassName = '', params: Parameter[] = []): void {
        this.parseClassParameters(classSchema).forEach((param) => {
            if (param.disposition && param.disposition === 'inline') {
                const inlineSchema = this.schema.find((schema) => schema.name === param.type);
                if (inlineSchema) {
                    this.recursivelyParseInlineParameters(inlineSchema, param.type, params);
                }
            } else {
                param.inlineClass = inlineClassName;
                if (param.declarable) {
                    params.push(param);
                    Helper.addRequiredImport(this.importList, param.type, param.paramName);
                }
            }
        });
    }

    /**
     * Generate param - type pair declaration
     * @param prefix - prefix of the declaration
     * @returns lines of the declaration
     */
    private generateParamTypePairLine(prefix: string): string[] {
        const generatedLines: string[] = [];
        this.classParameters
            .filter((param) => param.declarable && param.type !== this.superClassLayout?.type)
            .forEach((param) => {
                Helper.writeLines(this.generateComment(param.comments, 1), generatedLines);
                Helper.writeLines(
                    Helper.indent(`${prefix}${param.paramName}${param.condition ? '?' : ''}: ${param.type};`, 1),
                    generatedLines,
                );
            });
        return generatedLines;
    }

    /**
     * Generate constant parameter declaration line
     */
    private generateConstant(): void {
        this.classParameters
            .filter((param) => Helper.isConst(param))
            .forEach((param) => {
                const parentSchema = this.schema.find((schema) => schema.name === Helper.getArrayKind(param.type));
                if (parentSchema && Helper.isEnum(parentSchema.type)) {
                    param.value = parentSchema.values.find((value) => value.name === param.value)?.value;
                }
                Helper.writeLines(this.generateComment(param.comments, 1), this.generatedLines);
                Helper.writeLines(Helper.indent(`public readonly ${param.paramName} = ${param.value};`, 1), this.generatedLines);
            });
    }

    private getSuperClass(): Layout | undefined {
        if (this.classSchema.layout) {
            return this.classSchema.layout.find((l) => Helper.isInline(l) && Helper.shouldGenerateClass(l.type));
        }
        return undefined;
    }
}
