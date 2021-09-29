import * as fs from 'fs';
import * as YAML from 'js-yaml';
import * as path from 'path';
import { FileGenerator } from './src/FileGenerator';
import { Schema } from './src/interface/schema';

const filePath = path.join(__dirname, '/src/schema/symbol.yaml');
//const result: Schema = {};
const schema = YAML.load(fs.readFileSync(filePath, 'utf8')) as Schema[];

const fileGenerator = new FileGenerator(schema);
fileGenerator.generate();

// const lockStatus = a.find((o) => o.name === 'SecretProofTransactionBody');
// console.log(a);
// console.log(lockStatus);

// schema.forEach((item) => {
//     if (item.type === BuildInType.ENUM) {
//         const classPath = `/output/${item.name}Enum.ts`;
//         this.generateEnumClass(item, path.join(__dirname, classPath));
//     }
// });
