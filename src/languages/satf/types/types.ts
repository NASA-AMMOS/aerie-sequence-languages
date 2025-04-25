export type ParsedSeqn = {
  metadata: string;
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
  header: Record<string, string>;
  parameters?: string;
  variables?: string;
  steps?: string;
};

export type ParseSasf = {
  header: Record<string, string>;
  // parameters?: string;
  // variables?: string;
  requests?: string;
};
