// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import yargs from "yargs";
import { findUnknownOptions, rejectUnknownOptions } from "../unknown-options";

const options = {
  key: { app: true, "auto-approve": true, var: true, v: true, stacks: true },
  alias: { var: ["v"] },
  envPrefix: "CDKTF",
};

describe("findUnknownOptions", () => {
  it("accepts declared options in kebab and camel case, aliases and positionals", () => {
    const argv = {
      _: ["deploy"],
      $0: "cdktn",
      app: "x",
      "auto-approve": true,
      autoApprove: true,
      var: ["a=b"],
      v: ["a=b"],
      stacks: ["s"],
    };
    expect(findUnknownOptions(argv, options, {})).toEqual([]);
  });

  it("reports an unknown option once, even though yargs adds two spellings", () => {
    const argv = { _: [], "skip-synth-typo": true, skipSynthTypo: true };
    expect(findUnknownOptions(argv, options, {})).toEqual(["skip-synth-typo"]);
  });

  it("ignores options that only came from CDKTF_ environment variables", () => {
    const argv = { _: [], disableLogging: true, home: "/x", zzz: true };
    const env = { CDKTF_DISABLE_LOGGING: "true", CDKTF_HOME: "/x" };
    expect(findUnknownOptions(argv, options, env)).toEqual(["zzz"]);
  });
});

describe("cli with the middleware applied", () => {
  const handler = jest.fn();
  const run = (args: string[]) =>
    yargs(args)
      .env("CDKTF")
      .exitProcess(false)
      .showHelpOnFail(false)
      .command({
        command: "deploy [stacks..]",
        builder: (y) =>
          y
            .positional("stacks", { type: "string", array: true })
            .option("auto-approve", { type: "boolean" }),
        handler,
      })
      .middleware(rejectUnknownOptions as unknown as yargs.MiddlewareFunction)
      .parseAsync();

  beforeEach(() => handler.mockClear());

  it("runs the command for known options", async () => {
    await run(["deploy", "a", "--auto-approve"]);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown option without running the command", async () => {
    await expect(async () =>
      run(["deploy", "a", "--auto-aprove"]),
    ).rejects.toThrow("Unknown argument: auto-aprove");
    expect(handler).not.toHaveBeenCalled();
  });
});
