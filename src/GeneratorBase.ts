import { Helper } from './Helper';
import { Schema } from './interface/schema';
export class GeneratorBase {
    constructor(public readonly schema: Schema[]) {}

    /**
     * Generate comment block
     * @param comment - comment line
     * @param indentCount - indentation count
     * @param paramLines - optional parameter lines
     * @param returns - optional return line
     * @returns prepared comment block
     */
    protected generateComment(comment: string, indentCount = 0, paramLines: string[] = [], returns?: string): string[] {
        const commentLines = [Helper.indent('/**', indentCount)];
        Helper.writeLines(this.wrapComment(comment, indentCount), commentLines);
        if (paramLines.length > 0) {
            Helper.writeLines(paramLines, commentLines);
        }
        if (returns) {
            Helper.writeLines(this.wrapComment(`@returns ${comment}`, indentCount), commentLines);
        }
        commentLines.push(Helper.indent(' */', indentCount));
        return commentLines;
    }

    /**
     * Generate class header
     * @param schema - schema definition
     * @returns generated class header definition
     */
    protected getClassHeader(schema: Schema): string[] {
        const generatedLines: string[] = [];
        const classType = Helper.isEnum(schema.type) ? 'enum' : 'class';
        Helper.writeLines(this.generateComment(schema.comments ? schema.comments : schema.name), generatedLines);
        Helper.writeLines(`export ${classType} ${schema.name} implements Serializer {`, generatedLines);
        return generatedLines;
    }

    /**
     * Try wrap comment if it exceeds max line length (140)
     * @param comment - Comment line
     * @param indentCount - Line indentation count
     * @returns Wrapped comment lines
     */
    public wrapComment(comment: string, indentCount = 0): string[] {
        // sensitize comment string to replace the '\' with '*'
        comment = comment.replace('\\', '*');
        const chunkSize = 137;
        const chunks: string[] = [];
        while (comment.length > 0) {
            //Keep the whole word when wrapping
            const chopIndex = comment.length > chunkSize ? comment.lastIndexOf(' ') : chunkSize;
            chunks.push(Helper.indent(' * ' + comment.substring(0, chopIndex), indentCount));
            comment = comment.substring(chopIndex + 1);
        }
        return chunks;
    }
}
