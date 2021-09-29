import { GeneratorBase } from './GeneratorBase';
import { Helper } from './Helper';
import { Schema } from './interface/schema';

export class EnumGenerator extends GeneratorBase {
    private generatedLines: string[];

    constructor(public readonly classSchema: Schema, schema: Schema[]) {
        super(schema);
        this.generatedLines = [];
        this.getClassHeader();
    }

    public generate(): string[] {
        this.writeKeyValuePair();
        Helper.writeLines('}', this.generatedLines);
        return this.generatedLines;
    }

    private writeKeyValuePair(): void {
        this.classSchema.values.forEach((value) => {
            Helper.writeLines(this.generateComment(value.comments, 1), this.generatedLines);
            Helper.writeLines(Helper.indent(`${value.name} = ${value.value},`, 1), this.generatedLines);
        });
    }
    private getClassHeader(): void {
        Helper.writeLines(this.generateComment(this.classSchema.comments), this.generatedLines);
        return Helper.writeLines(`export enum ${this.classSchema.name} {`, this.generatedLines);
    }
}
