import { BuildInType, DispositionType } from './Enums';
import { Layout } from './interface/layout';

export class Helper {
    /**
     * Convert string name from snake_case, kebab-case, PascalCase to camel case.
     *
     * @param value - Input string
     * @returns camel case string
     */
    public static toCamel(value: string): string {
        return value.replace(/([-_][a-z])/gi, ($1) => {
            return $1.toUpperCase().replace('-', '').replace('_', '');
        });
    }

    /**
     * Check if schema type is struct
     * @param type - schema type
     * @returns true if schema type is struct
     */
    public static isStruct(type: string): boolean {
        return type === BuildInType.Struct.valueOf();
    }

    /**
     * Check if schema type is enum
     * @param type - schema type
     * @returns true if schema type is enum
     */
    public static isEnum(type: string): boolean {
        return type === BuildInType.Enum.valueOf();
    }

    /**
     * Check if schema type is byte
     * @param type - schema type
     * @returns true if schema type is byte
     */
    public static isByte(type: string): boolean {
        return type === BuildInType.Byte.valueOf();
    }

    /**
     * Check if layout attribute is inline
     * @param type - layout attribute
     * @returns true if layout attribute is inline
     */
    public static isInline(layout: Layout): boolean {
        return layout.disposition !== undefined && layout.disposition === DispositionType.Inline.valueOf();
    }

    /**
     * Check if layout attribute is const
     * @param type - layout attribute
     * @returns true if layout attribute is const
     */
    public static isConst(layout: Layout): boolean {
        return layout.disposition !== undefined && layout.disposition === DispositionType.Const.valueOf();
    }

    /**
     * Check if layout attribute is array
     * @param type - layout attribute
     * @returns true if layout attribute is array
     */
    public static isArray(layout: Layout): boolean {
        return layout.disposition !== undefined && layout.disposition === DispositionType.Array.valueOf();
    }

    /**
     * Check if layout attribute is reserved
     * @param type - layout attribute
     * @returns true if layout attribute is reserved
     */
    public static isReserved(layout: Layout): boolean {
        return layout.disposition !== undefined && layout.disposition === DispositionType.reserved.valueOf();
    }

    /**
     * Check if layout attribute is fill array
     * @param type - layout attribute
     * @returns true if layout attribute is fill array
     */
    public static isFillArray(layout: Layout): boolean {
        return layout.disposition !== undefined && layout.disposition === DispositionType.FillArray.valueOf();
    }

    /**
     * Check if layout attribute is element array
     * @param type - layout attribute
     * @returns true if layout attribute is element array
     */
    public static isElementArray(layout: Layout): boolean {
        return (
            layout.disposition !== undefined &&
            layout.disposition === DispositionType.Array.valueOf() &&
            layout.element_disposition !== undefined
        );
    }

    /**
     * Check if layout attribute is sorted array
     * @param type - layout attribute
     * @returns true if layout attribute is sorted array
     */
    public static isSortArray(layout: Layout): boolean {
        return layout.disposition !== undefined && layout.disposition === DispositionType.Array.valueOf() && layout.sort_key !== undefined;
    }

    /**
     * Check if layout attribute is conditional
     * @param type - layout attribute
     * @returns true if layout attribute is conditional
     */
    public static isConditional(layout: Layout): boolean {
        return layout.disposition !== undefined && layout.disposition === DispositionType.Array.valueOf() && layout.condition !== undefined;
    }

    /**
     * Apply indentation of an input text line
     * @param instruction - input text line
     * @param indentCount - indentation count
     * @returns indented line
     */
    public static indent(instruction: string, indentCount: number): string {
        return ' '.repeat(indentCount * 4) + instruction;
    }

    /**
     * Insert a line / lines to and string array
     * @param instructions - instruction line or lines
     * @param lines - lines to be injected into
     * @param newLineAfter - insert an empty line or not
     * @returns inserted lines
     */
    public static writeLines(instructions: string | string[], lines: string[], newLineAfter = false): void {
        instructions = typeof instructions === 'string' ? [instructions] : instructions;
        lines.push(...instructions);
        if (newLineAfter) {
            lines.push('');
        }
    }
}
