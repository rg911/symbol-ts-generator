import * as fs from 'fs-extra';
import { ClassGenerator } from './ClassGenerator';
import { EnumGenerator } from './EnumGenerator';
import { GeneratorBase } from './GeneratorBase';
import { Helper } from './Helper';
import { Schema } from './interface/schema';
import path = require('path');

export class FileGenerator extends GeneratorBase {
    private licenseHeader: string[];
    private indexList: string[];
    /**
     * Constructor
     * @param schema - Schema list from catbuffer
     * @param destination - destination folder
     */
    constructor(schema: Schema[], public readonly destination: string) {
        super(schema);
        this.licenseHeader = Helper.getLicense();
        this.indexList = [];
    }

    /**
     * Generate files
     */
    public generate(): void {
        this.schema.forEach((item) => {
            if (Helper.shouldGenerateClass(item.name)) {
                const filename = this.getGeneratedFileName(item);
                if (Helper.isEnum(item.type)) {
                    Helper.writeToFile(filename, this.destination, new EnumGenerator(item, this.schema).generate(), this.licenseHeader);
                } else {
                    Helper.writeToFile(filename, this.destination, new ClassGenerator(item, this.schema).generate(), this.licenseHeader);
                }
                this.indexList.push(`export * from './${item.name}';`);
            }
        });

        Helper.writeToFile(
            'index.ts',
            this.destination,
            this.indexList.sort((a, b) => a.localeCompare(b)),
            this.licenseHeader,
        );

        this.copyStaticFiles();
    }

    /**
     * Get generated file name
     * @param schema - Schema item
     * @returns - generated file name
     */
    private getGeneratedFileName(schema: Schema): string {
        return `${schema.name}.ts`;
    }

    /**
     * Copy static files to destination directory
     */
    private copyStaticFiles(): void {
        fs.copyFileSync(path.join(__dirname, '/static/utils/Serializer.ts'), this.destination + '/Serializer.ts');
        fs.copyFileSync(path.join(__dirname, '/static/utils/Utils.ts'), this.destination + '/Utils.ts');
    }
}
