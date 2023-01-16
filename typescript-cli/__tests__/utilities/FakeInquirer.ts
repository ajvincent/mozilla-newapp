import FakeInquirer, { FakeAnswers } from "#cli/utilities/FakeInquirer.js";

describe("FakeInquirer", () => {
  const debugInquirer = new FakeInquirer;
  beforeEach(() => debugInquirer.clear());

  it("allows us to ask sevaral questions", async () => {
    debugInquirer.set("confirmWrite", new FakeAnswers(true));
    debugInquirer.set("name", new FakeAnswers("John Doe"));

    const results = await debugInquirer.prompt<{
      confirmWrite: boolean,
      name: string
    }>
    ([
      {
        name: "confirmWrite",
        type: "confirm",
        message: "Do you want to proceed?",
        default: false
      },

      {
        name: "name",
        type: "input",
        message: "What is your name?",
      }
    ]);

    expect(results.confirmWrite).toBe(true);
    expect(results.name).toBe("John Doe");
    expect(Object.keys(results).length).toBe(2);
  });

  it("throws for missing answers", async () => {
    await expect(async () => {
      await debugInquirer.prompt<{
        confirmWrite: boolean
      }>
      ([
        {
          name: "confirmWrite",
          type: "confirm",
          message: "Do you want to proceed?",
          default: false
        }
      ]);
    }).rejects.toThrow(`No fake answers for question "confirmWrite"!`);
  });

  it("runs validation checks", async () => {
    debugInquirer.set(
      "name",
      new FakeAnswers(
        "John Doe",
        ["John Doe", "Jane Doe", "Tom Doe"],
        ["Frank Rizzo", "Leeroy Jenkins"]
      )
    );

    const namesCaptured: string[] = [];

    const results = await debugInquirer.prompt<{
      name: string
    }>
    ([
      {
        name: "name",
        type: "input",
        message: "What is your name?",
        validate(name: string) : true | string
        {
          namesCaptured.push(name);
          return (name.endsWith(" Doe")) ? true : "Name must end with Doe";
        }
      }
    ]);

    expect(results.name).toBe("John Doe");
    expect(namesCaptured).toEqual([
      "Frank Rizzo",
      "Leeroy Jenkins",
      "John Doe",
      "Jane Doe",
      "Tom Doe",
      "John Doe",
    ]);
  });

  it("throws for invalid final answers", async () => {
    debugInquirer.set("name", new FakeAnswers("Leeroy Jenkins"));

    await expect(debugInquirer.prompt<{
      name: string
    }>
    ([
      {
        name: "name",
        type: "input",
        message: "What is your name?",
        validate(name: string) : true | string
        {
          return (name.endsWith(" Doe")) ? true : "Name must end with Doe";
        }
      }
    ])).rejects.toThrow(
      `validation should have passed on question name with final answer "Leeroy Jenkins"`
    );
  });

  it("throws for invalid answers in the should-pass array", async () => {
    debugInquirer.set("name", new FakeAnswers("John Doe", ["Leeroy Jenkins"]));

    await expect(debugInquirer.prompt<{
      name: string
    }>
    ([
      {
        name: "name",
        type: "input",
        message: "What is your name?",
        validate(name: string) : true | string
        {
          return (name.endsWith(" Doe")) ? true : "Name must end with Doe";
        }
      }
    ])).rejects.toThrow(
      `validation should have passed on question name with answer "Leeroy Jenkins"`
    );
  });

  it("throws for invalid answers in the should-fail array", async () => {
    debugInquirer.set("name", new FakeAnswers("John Doe", [], ["Jane Doe"]));

    await expect(debugInquirer.prompt<{
      name: string
    }>
    ([
      {
        name: "name",
        type: "input",
        message: "What is your name?",
        validate(name: string) : true | string
        {
          return (name.endsWith(" Doe")) ? true : "Name must end with Doe";
        }
      }
    ])).rejects.toThrow(
      `validation should have failed on question name with answer "Jane Doe"`
    );
  });

  it("throws for answers in the should-pass array with no validation", async () => {
    debugInquirer.set("namePlease", new FakeAnswers("John Doe", ["Jane Doe"]));

    await expect(debugInquirer.prompt<{
      name: string
    }>
    ([
      {
        name: "namePlease",
        type: "input",
        message: "What is your name?",
      }
    ])).rejects.toThrow(
      `Validation test answers are present for a question with no validate method: "namePlease"`
    );
  });

  it("throws for answers in the should-fail array with no validation", async () => {
    debugInquirer.set("namePlease", new FakeAnswers("John Doe", [], ["Jane Doe"]));

    await expect(debugInquirer.prompt<{
      name: string
    }>
    ([
      {
        name: "namePlease",
        type: "input",
        message: "What is your name?",
      }
    ])).rejects.toThrow(
      `Validation test answers are present for a question with no validate method: "namePlease"`
    );
  });

  it("honors the askAnswered attribute of questions", async () => {
    let fakeAnswers = new FakeAnswers("John Doe");
    debugInquirer.set("name", fakeAnswers);

    const question = {
      name: "name",
      type: "input",
      message: "What is your name?",
      validate() : true
      {
        validationCount++;
        return true;
      }
    };

    let validationCount = 0;
    const firstResult = await debugInquirer.prompt<{
      name: string
    }>
    ([question, question]);

    expect(validationCount).toBe(1);

    fakeAnswers = new FakeAnswers("Jane Doe");
    debugInquirer.set("name", fakeAnswers);

    const secondResult = await debugInquirer.prompt<{
      name: string
    }>
    ([question, question], firstResult);

    expect(validationCount).toBe(1);
    expect(secondResult.name).toBe("John Doe");

    (question as unknown as { askAnswered: boolean }).askAnswered = true;

    const thirdResult = await debugInquirer.prompt<{
      name: string
    }>
    ([question, question], firstResult);

    expect(validationCount).toBe(3);
    expect(thirdResult.name).toBe("Jane Doe");
  });
});
