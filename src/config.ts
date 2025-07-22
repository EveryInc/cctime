import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface Config {
  defaultOutputFormat: 'json' | 'csv' | 'table';
  defaultExportPath: string;
  theme: {
    primaryColor: string;
    accentColor: string;
    chartStyle: 'line' | 'bar';
  };
  analysis: {
    includeSystemMessages: boolean;
    groupBySession: boolean;
    timeFormat: '12h' | '24h';
  };
  export: {
    includeMetadata: boolean;
    prettyPrint: boolean;
  };
}

const DEFAULT_CONFIG: Config = {
  defaultOutputFormat: 'table',
  defaultExportPath: './cctime-export',
  theme: {
    primaryColor: 'cyan',
    accentColor: 'yellow',
    chartStyle: 'line',
  },
  analysis: {
    includeSystemMessages: false,
    groupBySession: true,
    timeFormat: '24h',
  },
  export: {
    includeMetadata: true,
    prettyPrint: true,
  },
};

export class ConfigManager {
  private config: Config;
  private configPath: string;

  constructor(config: Config, configPath?: string) {
    this.config = config;
    this.configPath = configPath || join(homedir(), '.cctime', 'config.json');
  }

  get<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  set<K extends keyof Config>(key: K, value: Config[K]): void {
    this.config[key] = value;
  }

  getConfig(): Config {
    return { ...this.config };
  }

  async save(): Promise<void> {
    const dir = join(homedir(), '.cctime');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      this.configPath,
      JSON.stringify(this.config, null, 2),
      'utf-8'
    );
  }

  merge(partial: Partial<Config>): void {
    this.config = deepMerge(this.config, partial);
  }
}

export async function loadConfig(configPath?: string): Promise<Config> {
  const resolvedPath = configPath?.replace('~', homedir()) || 
    join(homedir(), '.cctime', 'config.json');

  try {
    const configData = await fs.readFile(resolvedPath, 'utf-8');
    const userConfig = JSON.parse(configData);
    
    // Validate config
    validateConfig(userConfig);
    
    // Merge with defaults
    return deepMerge(DEFAULT_CONFIG, userConfig);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Config file doesn't exist, use defaults
      return { ...DEFAULT_CONFIG };
    }
    throw new Error(`Failed to load config: ${error.message}`);
  }
}

function validateConfig(config: any): void {
  // Basic validation
  if (config.defaultOutputFormat && 
      !['json', 'csv', 'table'].includes(config.defaultOutputFormat)) {
    throw new Error(`Invalid output format: ${config.defaultOutputFormat}`);
  }
  
  if (config.theme?.chartStyle && 
      !['line', 'bar'].includes(config.theme.chartStyle)) {
    throw new Error(`Invalid chart style: ${config.theme.chartStyle}`);
  }
  
  if (config.analysis?.timeFormat && 
      !['12h', '24h'].includes(config.analysis.timeFormat)) {
    throw new Error(`Invalid time format: ${config.analysis.timeFormat}`);
  }
}

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && 
          source[key] !== null && 
          !Array.isArray(source[key])) {
        result[key] = deepMerge(
          result[key] as any, 
          source[key] as any
        );
      } else {
        result[key] = source[key] as any;
      }
    }
  }
  
  return result;
}

// Support environment variables
export function loadConfigFromEnv(config: Config): Config {
  const envConfig = { ...config };
  
  // CCTIME_OUTPUT_FORMAT
  if (process.env.CCTIME_OUTPUT_FORMAT) {
    envConfig.defaultOutputFormat = process.env.CCTIME_OUTPUT_FORMAT as any;
  }
  
  // CCTIME_EXPORT_PATH
  if (process.env.CCTIME_EXPORT_PATH) {
    envConfig.defaultExportPath = process.env.CCTIME_EXPORT_PATH;
  }
  
  // CCTIME_THEME_PRIMARY
  if (process.env.CCTIME_THEME_PRIMARY) {
    envConfig.theme.primaryColor = process.env.CCTIME_THEME_PRIMARY;
  }
  
  // CCTIME_THEME_ACCENT
  if (process.env.CCTIME_THEME_ACCENT) {
    envConfig.theme.accentColor = process.env.CCTIME_THEME_ACCENT;
  }
  
  // CCTIME_TIME_FORMAT
  if (process.env.CCTIME_TIME_FORMAT) {
    envConfig.analysis.timeFormat = process.env.CCTIME_TIME_FORMAT as any;
  }
  
  return envConfig;
}