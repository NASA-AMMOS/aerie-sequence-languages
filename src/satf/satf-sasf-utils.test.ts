import { describe, expect, it } from "vitest";
import { satfToSeqn, sasfToSeqn } from "./satf-sasf-utils.js";

describe("satfToSequence", () => {
  it("should return empty header and sequences for empty SATF string", async () => {
    const satf = "";
    const result = await satfToSeqn(satf);
    expect(result).toEqual({ header: "", sequences: [] });
  });

  it("should return empty for invalid SATF string", async () => {
    const satf = " invalid satf string ";

    const result = await satfToSeqn(satf);
    expect(result).toEqual({ header: "", sequences: [] });
  });

  it("should parse valid SATF string with header and sequences", async () => {
    const satf = `
      $$EOH
      CCS3ZF0000100000001NJPL3KS0L015$$MARK$$;
      MISSION_NAME = TEST;
      CCSD3RE00000$$MARK$$NJPL3IF0M01400000001;
      $$TEST     SPACECRAFT ACTIVITY TYPE FILE
      ************************************************************
      *PROJECT          TEST
      *SPACECRAFT       000
      *Input files used:
      *File Type	Last modified			File name
      *SC_MODEL	Thu Jan 01 00:00:00 UTC 1970	/Default Sequence Project/SC_MODEL/
      ************************************************************
      $$EOH
      absolute(temp,\\temp\\)
      $$EOF
    `;
    const result = await satfToSeqn(satf);
    expect(result).toHaveProperty("header");
    expect(result).toHaveProperty("sequences");
    expect(result.sequences).toBeInstanceOf(Array);
  });

  it("should return empty sequences for SATF string with missing sequences", async () => {
    const satf = `
      CCS3ZF0000100000001NJPL3KS0L015$$MARK$$;
      MISSION_NAME = TEST;
      CCSD3RE00000$$MARK$$NJPL3IF0M01400000001;
      $$TEST     SPACECRAFT ACTIVITY TYPE FILE
      ************************************************************
      *PROJECT          TEST
      *SPACECRAFT       000
      *Input files used:
      *File Type	Last modified			File name
      *SC_MODEL	Thu Jan 01 00:00:00 UTC 1970	/Default Sequence Project/SC_MODEL/
      ************************************************************
      $$EOH
      $$EOF
    `;
    const result = await satfToSeqn(satf);
    expect(result).toHaveProperty("header");
    expect(result.sequences).toEqual([]);
  });

  it("should return empty header for SATF string with missing header", async () => {
    const satf = `
      $$EOH
      absolute(temp,\\temp\\)
      $$EOF
    `;
    const result = await satfToSeqn(satf);
    expect(result).toHaveProperty("sequences");
    expect(result.header).toEqual("");
  });

  it("should return valid sequence with models", async () => {
    const satf = `
      $$EOH
      ABSOLUTE_SEQUENCE(test,\\testv01\\,
          STEPS,
          command (
            3472, SCHEDULED_TIME, \\00:01:00\\, EPOCH, INCLUSION_CONDITION, \\param_rate == receive_rate\\,
            DRAW, \\VERTICAL\\,
            COMMENT, \\This command turns, to correct position.\\, ASSUMED_MODEL_VALUES, \\x=1,z=1.1,y="abc"\\,
            01VV (param6, 10, false, "abc"),
            PROCESSORS, "PRI", end),
          end
        )
      $$EOF
    `;
    const result = await satfToSeqn(satf);
    expect(result).toHaveProperty("sequences");
    expect(result.sequences[0].name).toStrictEqual("test");
    expect(result.sequences[0].steps)
      .toStrictEqual(`E00:01:00 01VV param6 10 false "abc" # This command turns, to correct position.
@METADATA "INCLUSION_CONDITION" "param_rate == receive_rate"
@METADATA "DRAW" "VERTICAL"
@MODEL "x" 1 "00:00:00"
@MODEL "z" 1.1 "00:00:00"
@MODEL "y" "abc" "00:00:00"`);
  });

  it("should handle multiline comments", async () => {
    const satf = `
    $$EOH
    ABSOLUTE_SEQUENCE(test,\\testv01\\,
        STEPS,
        command (
          1, SCHEDULED_TIME, \\00:01:00\\, FROM_PREVIOUS_START, 
          COMMENT,\\"hi  : bye",
                 "A   : pickup shoe",
                 "B: put on shoe",
                 "C: tie shoe",
                 "cumulative_time is     1 sec (2024-00T01:00:00)"\\,
          echo),
        end
      )
    $$EOF
  `;
    const result = await satfToSeqn(satf);
    expect(result).toHaveProperty("sequences");
    expect(result.sequences[0].name).toStrictEqual("test");
    expect(result.sequences[0].steps).toStrictEqual(
      `R00:01:00 echo # hi  : bye", "A   : pickup shoe", "B: put on shoe", "C: tie shoe", "cumulative_time is     1 sec (2024-00T01:00:00)`,
    );
  });

  it("should return multiple sequence with models", async () => {
    const satf = `
      $$EOH
      ABSOLUTE_SEQUENCE(test,\\testv01\\,
          STEPS,
          command (
            3472, SCHEDULED_TIME, \\00:01:00\\, FROM_ACTIVITY_START, INCLUSION_CONDITION, \\param_rate == receive_rate\\,
            DRAW, \\VERTICAL\\,
            NTEXT, \\"this is a ntext"\\,
            COMMENT, \\This command turns, to correct position.\\, ASSUMED_MODEL_VALUES, \\x=1,z=1.1,y="abc"\\,
            01VV (param6, 10, false, "abc"),
            PROCESSORS, "PRI", end),
          end
        ),
      RT_on_board_block(test,\\testv01\\,
      RETURN_TYPE, \\VOID\\,
      SEQGEN_AUTO_START_OR_LOAD_TIMES, \\S$BEGIN\\,
      VIRTUAL_CHANNEL, \\VC2\\,
      ON_BOARD_FILENAME, \\/tmp/dir/file.seq\\,
      FLAGS,\\one | two | three\\,
      HELP,\\this is help text\\,
      ON_BOARD_PATH,\\path/to/file.txt\\,
          STEPS,
          command (
            3472, SCHEDULED_TIME, \\00:01:00\\, FROM_ACTIVITY_START,
            NTEXT, \\this is a ntext\\,
            COMMENT, \\This command turns, to correct position.\\, ASSUMED_MODEL_VALUES, \\x=1,z=1.1,y="abc"\\,
            01VV (param6, 10, false, "abc"),
            PROCESSORS, "PRI", end),
          end
        )
      $$EOF
    `;
    const result = await satfToSeqn(satf);
    expect(result).toHaveProperty("sequences");
    expect(result.sequences.length).toBe(2);
    expect(result.sequences[0].name).toStrictEqual("test");
    expect(result.sequences[0].steps)
      .toStrictEqual(`B00:01:00 01VV param6 10 false "abc" # This command turns, to correct position.
@METADATA "INCLUSION_CONDITION" "param_rate == receive_rate"
@METADATA "DRAW" "VERTICAL"
@METADATA "NTEXT" "this is a ntext"
@MODEL "x" 1 "00:00:00"
@MODEL "z" 1.1 "00:00:00"
@MODEL "y" "abc" "00:00:00"`);

    expect(result.sequences[1].metadata)
      .toStrictEqual(`@METADATA "VIRTUAL_CHANNEL" "VC2"
@METADATA "ON_BOARD_FILENAME" "/tmp/dir/file.seq"
@METADATA "ON_BOARD_PATH" "path/to/file.txt"
@METADATA "SEQGEN" "S$BEGIN"`);
    expect(result.sequences[1].steps)
      .toStrictEqual(`B00:01:00 01VV param6 10 false "abc" # This command turns, to correct position.
@METADATA "NTEXT" "this is a ntext"
@MODEL "x" 1 "00:00:00"
@MODEL "z" 1.1 "00:00:00"
@MODEL "y" "abc" "00:00:00"`);
  });

  it("should use globals", async () => {
    const sasf = `
      $$EOH
      RT_on_board_block(test,\\testv01\\,
          STEPS,
          command (
            1, SCHEDULED_TIME, \\00:01:00\\, FROM_PREVIOUS_START, INCLUSION_CONDITION,
            ECHO ("GlobalG", 10, "NOGLOBAL")
            ),
          end
        )
      $$EOF
    `;
    const result = await satfToSeqn(sasf, ["GlobalG"]);
    expect(result).toHaveProperty("sequences");
    expect(result.sequences[0].name).toStrictEqual("test");
    expect(result.sequences[0].steps).toStrictEqual(
      `R00:01:00 ECHO GlobalG 10 "NOGLOBAL"`,
    );
  });

  it("Parameters", async () => {
    const satf = `
      $$EOH
      RT_on_board_block(/start.txt,\\start\\,
        PARAMETERS,
        unsigned_decimal(
          TYPE,UNSIGNED_DECIMAL,
          RANGE,\\10.01...99.99\\,
          RANGE,\\100...199.99\\,
        ),
        signed_decimal(
          TYPE,SIGNED_DECIMAL,
          DEFAULT, 10
          RANGE,\\10, 90000, 120000, 150000, 360001\\,
          HELP, \\This is a help\\
        ),
        hex(
          TYPE,HEXADECIMAL,
          RANGE,\\0x00...0xff\\
        ),
        octal(
          TYPE,OCTAL,
          DEFAULT, 10
          RANGE,\\0, 1, 2, 3, 4, 5, 6, 7\\
        ),
        binary(
          TYPE,BINARY,
          RANGE,\\0, 1\\),
        engine(
          TYPE,ENGINEERING,
        ),
        time(
          TYPE,TIME,
          RANGE,\\0T00:00:00...100T00:00:00\\
        ),
        duration(
          TYPE,DURATION,
          DEFAULT, \\00:01:00\\
        ),
        enum(
          TYPE,STRING,
          ENUM_NAME,\\STORE_NAME\\,
          DEFAULT, \\BOB_HARDWARE\\,
          RANGE,\\BOB_HARDWARE, SALLY_FARM, "TIM_FLOWERS"\\
        ),
        string(
          TYPE,STRING,
          DEFAULT, abc
        ),
        quoted_string(
          TYPE,QUOTED_STRING,
          DEFAULT, "abc"
          RANGES,\\"abc", "123"\\
        ),
        end,
        STEPS,
          command (
            1, SCHEDULED_TIME, \\00:01:00\\, FROM_ACTIVITY_START,
            NOOP()
          end
        )
      $$EOF
    `;
    const result = await satfToSeqn(satf);
    expect(result).toHaveProperty("sequences");
    expect(result.sequences[0].name).toStrictEqual("start.txt");
    expect(result.sequences[0].inputParameters)
      .toStrictEqual(`@INPUT_PARAMS_BEGIN
unsigned_decimal UINT "10.01...99.99, 100...199.99"
signed_decimal INT "" "10, 90000, 120000, 150000, 360001"
hex STRING "0x00...0xff"
octal STRING "" "0, 1, 2, 3, 4, 5, 6, 7"
binary STRING "" "0, 1"
engine FLOAT
time STRING "0T00:00:00...100T00:00:00"
duration STRING
enum ENUM STORE_NAME "" "BOB_HARDWARE, SALLY_FARM, TIM_FLOWERS"
string ENUM
quoted_string STRING "" "abc, 123"
@INPUT_PARAMS_END`);

    expect(result.sequences[0].steps).toStrictEqual(`B00:01:00 NOOP`);
  });

  it("Quoted Parameters", async () => {
    const satf = `
      $$EOH
      RT_on_board_block(/start.txt,\\start\\,
        PARAMETERS,
        attitude_spec(
          TYPE,STRING,
          ENUM_NAME,\\STORE_NAME\\,
          RANGE,\\"BOB_HARDWARE", "SALLY_FARM", "TIM_FLOWERS"\\
        ),
        end,
        STEPS,
          command (
            1, SCHEDULED_TIME, \\00:01:00\\, FROM_ACTIVITY_START, INCLUSION_CONDITION, \\param_rate == receive_rate\\,
            ECHO ("abc","attitude_spec")
          end
        )
      $$EOF
    `;
    const result = await satfToSeqn(satf);
    expect(result).toHaveProperty("sequences");
    expect(result.sequences[0].name).toStrictEqual("start.txt");
    expect(result.sequences[0].inputParameters)
      .toStrictEqual(`@INPUT_PARAMS_BEGIN
attitude_spec ENUM STORE_NAME "" "BOB_HARDWARE, SALLY_FARM, TIM_FLOWERS"
@INPUT_PARAMS_END`);

    expect(result.sequences[0].steps)
      .toStrictEqual(`B00:01:00 ECHO "abc" attitude_spec
@METADATA "INCLUSION_CONDITION" "param_rate == receive_rate"`);
  });
});

describe("sasfToSequence", () => {
  it("should return empty header and sequences for empty SATF string", async () => {
    const sasf = "";
    const result = await sasfToSeqn(sasf);
    expect(result).toEqual({ header: "", sequences: [] });
  });

  it("should return empty invalid SATF string", async () => {
    const sasf = " invalid satf string ";

    const result = await sasfToSeqn(sasf);
    expect(result).toEqual({ header: "", sequences: [] });
  });

  it("should parse valid SASF string with header and sequences", async () => {
    const sasf = `
      $$EOH
      CCS3ZF0000100000001NJPL3KS0L015$$MARK$$;
      MISSION_NAME = TEST;
      CCSD3RE00000$$MARK$$NJPL3IF0M01400000001;
      $$TEST     SPACECRAFT ACTIVITY TYPE FILE
      ************************************************************
      *PROJECT          TEST
      *SPACECRAFT       000
      *Input files used:
      *File Type	Last modified			File name
      *SC_MODEL	Thu Jan 01 00:00:00 UTC 1970	/Default Sequence Project/SC_MODEL/
      ************************************************************
      $$EOH
      $$EOD
      $$EOF
    `;
    const result = await sasfToSeqn(sasf);
    expect(result).toHaveProperty("header");
    expect(result).toHaveProperty("sequences");
    expect(result.sequences).toBeInstanceOf(Array);
  });

  it("should return valid request with models", async () => {
    const sasf = `
      $$EOH
      $$EOD
      request(VFT2_REQUEST_01,
        START_TIME, 2024-266T19:59:57,
        REQUESTOR, "me",
        PROCESSOR, "VC2AB",
        KEY, "No_Key")

        command(1,
          SCHEDULED_TIME,\\00:00:01\\,FROM_PREVIOUS_START,
          COMMENT,\\"this "is a" comment"\\,
          FILE_REMOVE("/eng/seq/awesome.abs", TRUE)
        ),
        command(2,
          SCHEDULED_TIME,\\00:00:01\\,FROM_PREVIOUS_START,
          COMMENT,\\cumulative_time is "2 sec"\\,
          USER_SEQ_ECHO("SEQ awesome COMPLETION IN 2 MINS")
        ),
        end;
      $$EOF
    `;
    const result = await sasfToSeqn(sasf);
    expect(result).toHaveProperty("sequences");
    expect(result.sequences[0].name).toStrictEqual("VFT2_REQUEST_01");
    expect(result.sequences[0].requests)
      .toStrictEqual(`A2024-266T19:59:57 @REQUEST_BEGIN("VFT2_REQUEST_01")
  R00:00:01 FILE_REMOVE "/eng/seq/awesome.abs" TRUE # this "is a" comment
  R00:00:01 USER_SEQ_ECHO "SEQ awesome COMPLETION IN 2 MINS" # cumulative_time is "2 sec"
@REQUEST_END
@METADATA "REQUESTOR" "me"
@METADATA "PROCESSOR" "VC2AB"
@METADATA "KEY" "No_Key"
`);
  });
});
