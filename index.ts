import * as fs from 'fs';
import * as YAML from 'js-yaml';
import * as path from 'path';
import { FileGenerator } from './src/FileGenerator';
import { Schema } from './src/interface/schema';

const symbolPath = path.join(__dirname, '/src/schema/symbol.yaml');
const symbolSchema = YAML.load(fs.readFileSync(symbolPath, 'utf8')) as Schema[];

const symbolGenerator = new FileGenerator(symbolSchema, '/build/symbol');
symbolGenerator.generate();

const nemPath = path.join(__dirname, '/src/schema/nem.yaml');
const nemSchema = YAML.load(fs.readFileSync(nemPath, 'utf8')) as Schema[];

const nemGenerator = new FileGenerator(nemSchema, '/build/nem');
nemGenerator.generate();
