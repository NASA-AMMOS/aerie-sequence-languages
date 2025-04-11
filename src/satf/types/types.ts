export type ParsedSeqn = {
  header: string;
  sequences: Seqn[];
};

export type Seqn = {
  name: string;
  metadata?: string;
  inputParameters?: string;
  localVariables?: string;
  steps?: string;
  requests?: string;
};

export type ParsedSatf = {
  metadata: Record<string, string>;
  variables?: string;
  steps?: string;
};

export type ParseSasf = {
  metadata: Record<string, string>;
  variables?: string;
  requests?: string;
};
