import { Helper } from './Helper';
import { Schema } from './interface/schema';

export class TransactionHelperGenerator {
    /**
     * Constructor
     * @param classSchema - schema of the class to be generated
     * @param schema - schema list
     */
    constructor(public readonly schemas: Schema[], public readonly destination: string) {}

    /**
     * Generate helper classes
     */
    public generate(): void {
        ['Transaction', 'EmbeddedTransaction'].forEach((helperType) => {
            const generatedLines: string[] = [];
            const importLines: string[] = [helperType, 'TransactionType'];
            const bodyLines = this.generateHelperClassBody(helperType, importLines);

            Helper.writeLines(Helper.getLicense(), generatedLines, true);
            console.log(importLines);
            importLines
                .sort((a, b) => a.localeCompare(b))
                .forEach((item) => {
                    Helper.writeLines(`import { ${item} } from './${item}';`, generatedLines);
                });
            Helper.writeLines('', generatedLines);
            Helper.writeLines(this.generateHelperClassHeader(helperType), generatedLines);
            Helper.writeLines(bodyLines, generatedLines);
            Helper.writeLines(this.generateHelperClassFooter(), generatedLines);

            Helper.writeToFile(`${helperType}Helper.ts`, this.destination, generatedLines, []);
        });
    }

    /**
     * Generate helper class header lines
     * @param helperType - Helper class type
     * @returns Generated class header lines
     */
    private generateHelperClassHeader(helperType: string): string[] {
        const generatedLines: string[] = [];
        Helper.writeLines(`export class ${helperType}Helper {`, generatedLines);
        Helper.writeLines(Helper.indent(`public static deserialize(payload: Uint8Array): ${helperType} {`, 1), generatedLines);
        Helper.writeLines(Helper.indent(`const header = ${helperType}.deserialize(payload);`, 2), generatedLines);
        return generatedLines;
    }

    /**
     * Generate helper class body
     * @param helperType - Helper class type
     * @param importLines - Required import lines
     * @returns Generated helper class body
     */
    private generateHelperClassBody(helperType: string, importLines: string[]): string[] {
        const generatedLines: string[] = [];
        this.schemas
            .filter((schema) => {
                return (
                    schema.name !== helperType &&
                    schema.name.endsWith('Transaction') &&
                    (helperType === 'Transaction' ? !schema.name.startsWith('Embedded') : schema.name.startsWith('Embedded'))
                );
            })
            .forEach((schema) => {
                const transactionName = schema.name;
                const transactionType = schema.layout.find((layout) => layout.name === 'TRANSACTION_TYPE')?.value as string;
                const transactionVersion = schema.layout.find((layout) => layout.name === 'TRANSACTION_VERSION')?.value as number;
                generatedLines.push(...this.generateDeserializeLines(transactionName, transactionType, transactionVersion));
                importLines.push(schema.name);
            });
        return generatedLines;
    }

    /**
     * Generate helper function lines per transaction
     * @param transactionName - Transaction class name
     * @param transactionType - Transaction type constant
     * @param transactionVersion - Transaction version constant
     * @returns helper class method lines
     */
    private generateDeserializeLines(transactionName: string, transactionType: string, transactionVersion: number): string[] {
        const generatedLines: string[] = [];
        Helper.writeLines(
            Helper.indent(`if (header.type === TransactionType.${transactionType} && header.version === ${transactionVersion}){`, 2),
            generatedLines,
        );
        Helper.writeLines(Helper.indent(`return ${transactionName}.deserialize(payload);`, 3), generatedLines);
        Helper.writeLines(Helper.indent(`}`, 2), generatedLines);
        return generatedLines;
    }

    private generateHelperClassFooter(): string[] {
        const generatedLines: string[] = [];
        Helper.writeLines(Helper.indent(`return header;`, 2), generatedLines);
        Helper.writeLines(Helper.indent(`}`, 1), generatedLines);
        Helper.writeLines(`}`, generatedLines);
        return generatedLines;
    }
}
