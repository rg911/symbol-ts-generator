import { ClassGenerator } from './ClassGenerator';
import { EnumGenerator } from './EnumGenerator';
import { GeneratorBase } from './GeneratorBase';
import { Helper } from './Helper';
import { Schema } from './interface/schema';
import path = require('path');
import fs = require('fs');
import LineByLine = require('n-readlines');

export class FileGenerator extends GeneratorBase {
    private licenseHeader: string[];
    /**
     * Constructor
     * @param schema - Schema list from catbuffer
     */
    constructor(schema: Schema[]) {
        super(schema);
        this.licenseHeader = this.getLicense();
    }

    /**
     * Generate file
     */
    public generate(): void {
        this.schema.forEach((item) => {
            const filename = this.getGeneratedFileName(item);
            if (Helper.isEnum(item.type)) {
                this.writeToFile(filename, new EnumGenerator(item, this.schema).generate());
            } else {
                this.writeToFile(filename, new ClassGenerator(item, this.schema).generate());
            }
            //this.writeToFile(filename, fileContent);
        });
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
     * Inject license boilerplate to an existing file content
     * @param fileContent - existing generated file content
     */
    private getLicense(): string[] {
        const lines = new LineByLine(path.join(__dirname, './HEADER.inc'));
        let line: false | Buffer;
        const licenseLines: string[] = [];
        while ((line = lines.next())) {
            licenseLines.push(line.toString());
        }
        return licenseLines;
    }

    /**
     * Write content into file
     * @param fileName - filename
     * @param fileContent - file content
     */
    private writeToFile(fileName: string, fileContent: string[]): void {
        const writeStream = fs.createWriteStream(path.join(__dirname, `/build/${fileName}`));
        this.licenseHeader.forEach((line) => writeStream.write(`${line}\n`));
        fileContent.forEach((line) => writeStream.write(`${line}\n`));
        writeStream.on('finish', () => {
            console.log(`${fileName} has been generated.`);
        });
        writeStream.on('error', (err) => {
            throw err;
        });
        writeStream.end();
    }
}
